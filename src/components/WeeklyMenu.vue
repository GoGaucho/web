<script setup>
import { computed, ref, watch } from 'vue'
import { VideoCameraIcon } from '@heroicons/vue/24/outline'
import { get } from '../firebase.js'
import { cache } from '../model.js'
import { selectDiningMeal } from '../utils/diningSelection.mjs'
import { dishColorClass as itemClass } from '../utils/dining.js'
import Wrapper from './Wrapper.vue'

const props = defineProps({ diningCommons: Object })
const savedDiningCommon = cache.get('dining')
const dc = ref(Object.hasOwn(props.diningCommons, savedDiningCommon) ? savedDiningCommon : 'carrillo')
const meal = ref('')
const selectedDate = ref('')
const weeklyDays = ref([])
const cachedMenus = ref([])
const campusDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short'
})

function dateLabel(date) {
  const parts = Object.fromEntries(campusDate.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.weekday} ${parts.month}/${parts.day}`
}

const now = new Date()
const today = dateLabel(now)
const campusToday = Object.fromEntries(campusDate.formatToParts(now).map(({ type, value }) => [type, value]))
const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
const tomorrow = dateLabel(tomorrowDate)

function dayTabLabel(date) {
  if (date === today) return 'Today'
  if (date === tomorrow) return 'Tomorrow'
  return ''
}
function dayNumber(date) {
  return date.split('/')[1]
}
function displayDate(label) {
  const match = label.match(/(\d{1,2})\/(\d{1,2})$/)
  if (!match) return label

  const [, month, day] = match
  const monthOffset = Number(month) - Number(campusToday.month)
  // UCSB publishes a week without years, so pick the year nearest the campus date.
  let year = Number(campusToday.year)
  if (monthOffset > 6) year--
  if (monthOffset < -6) year++
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
const dailyDays = computed(() => cachedMenus.value.map(({ date, data }) => ({
  date: dateLabel(new Date(`${date}T12:00:00Z`)),
  menuDate: date,
  dailyMeals: data[dc.value],
  meals: Object.fromEntries(Object.entries(data[dc.value] || {}).filter(([, entry]) => entry)
    .map(([name, entry]) => [name, entry.menu]))
})))
const days = computed(() => weeklyDays.value.length ? weeklyDays.value : dailyDays.value)
const dailyMenu = computed(() => dailyDays.value.find(day => day.date === selectedDate.value))

Promise.allSettled(['cache/dining', 'cache/dining-next'].map(async path => {
  const { date, data } = await get(path)
  const day = new Date(`${date}T12:00:00Z`)
  const menus = JSON.parse(data)
  if (!Number.isFinite(day.getTime()) || !menus) throw new Error('Invalid cached menu')
  return { date, data: menus }
})).then(results => {
  cachedMenus.value = results.filter(result => result.status === 'fulfilled').map(result => result.value)
})
const loading = ref(false)
const error = ref('')
const mealOrder = ['breakfast', 'brunch', 'lunch', 'dinner', 'late-night']
const selectedDay = computed(() => days.value.find(day => day.date === selectedDate.value))
/*const selectedDateIndex = computed(() =>
  days.value.findIndex(day => day.date === selectedDate.value)
)
function changeDay(direction) {
  const newIndex = selectedDateIndex.value + direction
  if (newIndex >= 0 && newIndex < days.value.length) {
    selectedDate.value = days.value[newIndex].date
  }
}*/

const meals = computed(() => mealOrder.filter(name => selectedDay.value?.meals[name]))
const mealHours = computed(() => dailyMenu.value?.dailyMeals?.[meal.value]?.hour)
const stations = computed(() => selectedDay.value?.meals[meal.value] || {})
let currentRequest = 0

async function loadMenu() {
  const request = ++currentRequest
  loading.value = true
  error.value = ''
  weeklyDays.value = []
  try {
    const response = await fetch(`/api/dining/week?dc=${encodeURIComponent(dc.value)}`)
    if (!response.ok) throw new Error('Unable to load weekly menus')
    const result = await response.json()
    if (!Array.isArray(result.days)) throw new Error('Invalid menu response')
    if (request === currentRequest) weeklyDays.value = result.days
  } catch {
    if (request === currentRequest) error.value = 'Weekly menus are temporarily unavailable. Try again or open UCSB’s menu below.'
  } finally {
    if (request === currentRequest) loading.value = false
  }
}

watch(dc, () => {
  cache.set('dining', dc.value)
  loadMenu()
}, { immediate: true })

watch([days, loading], ([availableDays, isLoading]) => {
  if (isLoading || availableDays.some(day => day.date === selectedDate.value)) return
  selectedDate.value = availableDays.find(day => day.date === today)?.date || availableDays[0]?.date || ''
})

watch([meals, loading], ([available, isLoading]) => {
  if (isLoading || !available.length || available.includes(meal.value)) return
  const daily = dailyMenu.value
  const currentMeal = selectDiningMeal(daily?.dailyMeals, '', daily?.menuDate)
  meal.value = available.includes(currentMeal) ? currentMeal : available[0]
})

function showCam () {
  Swal.fire({ title: props.diningCommons[dc.value], showConfirmButton: false, html: `<img src="https://api.ucsb.edu/dining/cams/v2/stream/${dc.value}?ucsb-api-key=%20s5MpI868GtPpozL8Q6bfnmMMIUXDeznl">` })
}

function mealLabel(name) {
  return name === 'late-night' ? 'Late night' : name[0].toUpperCase() + name.slice(1)
}

</script>

<template>
<div v-if="days.length && !loading" class="my-3">
  <div class="flex gap-2 overflow-x-auto pb-2">

    <button
      v-for="day in days"
      :key="day.date"
      type="button"
      @click="selectedDate = day.date"
      :aria-label="`View menu for ${displayDate(day.date)}`"
      :aria-pressed="selectedDate === day.date"
      class="flex flex-col items-center justify-center
             min-w-[80px] px-3 py-2 rounded-lg border
             transition-colors cursor-pointer"
      :class="
        selectedDate === day.date
          ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
      "
    >
      <span class="text-xs">
        {{ day.date.split(' ')[0] }}
      </span>
      <span class="text-lg">
        {{ dayNumber(day.date) }}
      </span>
      <span class="text-xs h-4">
        {{ dayTabLabel(day.date) }}
      </span>

    </button>

  </div>
  <div class="flex items-center justify-between mt-2">

    <p class="text-sm font-semibold text-gray-700">
      {{ dayTabLabel(selectedDate) || displayDate(selectedDate) }}'s Menu
      <span class="text-gray-500 font-normal">
        ({{ displayDate(selectedDate) }})
      </span>
    </p>
    <button
      v-if="selectedDate !== today && days.some(day => day.date === today)"
      type="button"
      @click="selectedDate = today"
      class="text-sm text-blue-500 hover:underline"
    >
      Back to Today
    </button>
  </div>
</div>
  
  <slot name="actions"/>
  <section class="rounded shadow-md p-3 my-4 bg-white" aria-labelledby="weekly-menu-heading" :aria-busy="loading">
    <h2 id="weekly-menu-heading" class="text-2xl flex items-center flex-wrap">
      Meals
      <select v-model="dc" aria-label="Dining common" class="text-base bg-white border font-bold mx-2 px-4 py-1 rounded-full appearance-none cursor-pointer">
        <option v-for="(name, code) in props.diningCommons" :key="code" :value="code">{{ name }}</option>
      </select>
      <button type="button" aria-label="Show dining hall camera" class="ml-2 text-gray-500" @click="showCam">
        <VideoCameraIcon class="w-6" />
      </button>
    </h2>
    <p v-if="meals.length && !loading" class="flex items-center text-gray-700 my-2">
      <select v-model="meal" aria-label="Meal" class="px-2 mr-2 appearance-none bg-white font-bold block rounded cursor-pointer border">
        <option v-for="name in meals" :key="name" :value="name">{{ mealLabel(name) }}</option>
      </select>
      {{ mealHours }}
    </p>
    <hr class="mt-1 mb-2">
    <p v-if="loading" role="status" class="text-sm text-gray-500 py-2">Loading weekly menus…</p>
    <div v-if="error" role="alert" class="py-2">
      <p>{{ error }}</p>
      <button type="button" class="border rounded px-3 py-1 mt-2 text-blue-500" @click="loadMenu">Try again</button>
    </div>
    <p v-if="!loading && !error && !days.length" class="text-sm text-gray-500 py-2">No weekly menus have been published yet.</p>
    <p v-if="!loading && days.length && !meals.length" class="text-sm text-gray-500 py-2">No meals have been published for this date. Try another day or dining common.</p>
    <div v-if="!loading && meals.length" :key="dc + selectedDate + meal" class="w-full">
      <Wrapper :show="1">
        <div v-for="(items, station) in stations" :key="station" class="px-2">
          <h4 class="font-bold mt-2 mb-1">{{ station }}</h4>
          <div class="ml-1 text-gray-700">
            <div v-for="(item, index) in items" :key="index" class="border-l-2 bg-gradient-to-r to-white px-2" :class="itemClass(item)">{{ item }}</div>
          </div>
        </div>
      </Wrapper>
    </div>
    <p class="text-xs text-gray-500 mt-3">Dates published by UCSB. Menus are subject to change.
      <a class="text-blue-500 hover:underline" :href="`https://apps.dining.ucsb.edu/menu/week?dc=${dc}`" target="_blank" rel="noopener noreferrer">Official menu<span class="sr-only"> (new tab)</span></a>
    </p>
  </section>
</template>
