<script setup>
import { computed, ref, watch } from 'vue'
import { dishColorClass as itemClass } from '../utils/dining.js'
import Wrapper from './Wrapper.vue'

const props = defineProps({ diningCommons: Object, initialDiningCommon: String })
const dc = ref(props.diningCommons[props.initialDiningCommon] ? props.initialDiningCommon : 'carrillo')
const meal = ref('lunch')
const selectedDate = ref('')
const days = ref([])
const loading = ref(false)
const error = ref('')
const mealOrder = ['breakfast', 'brunch', 'lunch', 'dinner', 'late-night']
const selectedDay = computed(() => days.value.find(day => day.date === selectedDate.value))
const meals = computed(() => mealOrder.filter(name => selectedDay.value?.meals[name]))
const stations = computed(() => selectedDay.value?.meals[meal.value] || {})
let currentRequest = 0

async function loadMenu() {
  const request = ++currentRequest
  loading.value = true
  error.value = ''
  days.value = []
  try {
    const response = await fetch(`/api/dining/week?dc=${encodeURIComponent(dc.value)}`)
    if (!response.ok) throw new Error('Unable to load weekly menus')
    const result = await response.json()
    if (!Array.isArray(result.days)) throw new Error('Invalid menu response')
    if (request === currentRequest) {
      days.value = result.days
      if (!result.days.some(day => day.date === selectedDate.value)) selectedDate.value = result.days[0]?.date || ''
    }
  } catch {
    if (request === currentRequest) error.value = 'Weekly menus are temporarily unavailable. Try again or open UCSB’s menu below.'
  } finally {
    if (request === currentRequest) loading.value = false
  }
}

watch(dc, loadMenu, { immediate: true })
watch(meals, available => {
  if (available.length && !available.includes(meal.value)) meal.value = available[0]
})

function mealLabel(name) {
  return name === 'late-night' ? 'Late night' : name[0].toUpperCase() + name.slice(1)
}

</script>

<template>
  <section class="rounded shadow-md p-3 my-4 bg-white" aria-labelledby="weekly-menu-heading" :aria-busy="loading">
    <h2 id="weekly-menu-heading" class="text-2xl flex items-center flex-wrap">
      Meals
      <select v-model="dc" aria-label="Dining common" class="text-base bg-white border font-bold mx-2 px-4 py-1 rounded-full appearance-none cursor-pointer">
        <option v-for="(name, code) in props.diningCommons" :key="code" :value="code">{{ name }}</option>
      </select>
    </h2>
    <p v-if="days.length && !loading" class="flex items-center text-gray-700 my-2">
      <label for="weekly-menu-date" class="text-sm mr-2">Date</label>
      <select id="weekly-menu-date" v-model="selectedDate" class="px-2 appearance-none bg-white font-bold block rounded cursor-pointer border">
        <option v-for="day in days" :key="day.date" :value="day.date">{{ day.date }}</option>
      </select>
    </p>
    <p v-if="meals.length && !loading" class="flex items-center text-gray-700 my-2">
      <select v-model="meal" aria-label="Meal" class="px-2 mr-2 appearance-none bg-white font-bold block rounded cursor-pointer border">
        <option v-for="name in meals" :key="name" :value="name">{{ mealLabel(name) }}</option>
      </select>
    </p>
    <hr class="mt-1 mb-2">
    <p v-if="loading" role="status" class="text-sm text-gray-500 py-2">Loading weekly menus…</p>
    <div v-else-if="error" role="alert" class="py-2">
      <p>{{ error }}</p>
      <button type="button" class="border rounded px-3 py-1 mt-2 text-blue-500" @click="loadMenu">Try again</button>
    </div>
    <p v-else-if="!days.length" class="text-sm text-gray-500 py-2">No weekly menus have been published yet.</p>
    <p v-else-if="!meals.length" class="text-sm text-gray-500 py-2">No meals have been published for this date. Try another day or dining common.</p>
    <div v-else :key="dc + selectedDate + meal" class="w-full">
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
