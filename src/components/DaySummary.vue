<script setup>
import { onActivated, watch } from 'vue'
import { state, cache } from '../model.js'
import { classrooms } from '../utils/locations.js'
import { MapPinIcon, AcademicCapIcon } from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
const router = useRouter()
let classes = $ref(false)

function getClasses () {
  const schedule = cache.get('class' + state.quarter)?.schedule
  if (!schedule) return classes = false
  classes = []
  const day = (new Date()).getDay()
  for (const c in schedule) {
    const session = schedule[c].session?.substring(5).trim()
    const periods = schedule[c].periods
    for (const p of periods) {
      for (const w of p.wTime) {
        if (w[0] < (day - 1) * 1440 || w[1] > day * 1440) continue
        classes.push({
          course: c, session,
          location: p.location,
          wTime: w,
          time: p.time.replace(/^(.*?)\s/, '')
        })
      }
    }
  }
  classes.sort((a, b) => a.wTime[0] - b.wTime[0])
}

getClasses()
onActivated(getClasses)
watch(() => state.quarter, getClasses)
watch(() => state.user.time, () => {
  if (!state.user.name) {
    classes = false
    cache.set('class' + state.quarter, false)
  } else getClasses()
})

function locate (location) {
  if (classrooms[location]) router.push('/map?q=' + location)
}
</script>

<template>
  <div class="mb-4 sm:mb-8 -mx-6 sm:mx-0 sm:max-w-full relative h-28 flex items-center overflow-x-auto bg-white p-4 sm:rounded border">
    <Transition name="fade" mode="out-in">
      <button v-if="!classes" class="bg-blue-500 rounded-full mx-10 px-4 py-2 font-bold text-white all-transition shadow hover:shadow-md" @click="router.push('/class')">Load your classes</button>
      <div v-else class="h-full flex items-center">
        <div v-for="c in classes" class="relative rounded-r-sm p-2 mx-1 h-full bg-blue-50 overflow-hidden w-40">
          <div>
            <b>{{ c.course }}</b>
            <span class="text-xs ml-1" v-if="c.session">(session {{ c.session }})</span>
          </div>
          <div class="text-sm flex items-center" :class="classrooms[c.location] && 'cursor-pointer'" @click="locate(c.location)">
            {{ c.location }}
            <MapPinIcon class="ml-1 w-5 text-gray-500" v-if="classrooms[c.location]" />
          </div>
          <div class="text-sm">{{ c.time }}</div>
          <div class="all-transition absolute bottom-0 top-0 left-0 w-0.5 bg-blue-500" />
        </div>
        <div class="mx-2">
          <div v-if="classes && !classes.length">You don't have classes today! 👻</div>
          <button v-if="classes" class="bg-white rounded-full px-4 py-2 my-2 all-transition text-blue-500 flex items-center font-bold border hover:bg-gray-100 whitespace-nowrap" @click="router.push('/class')"><AcademicCapIcon class="w-6 mr-2" />Full Schedule</button>
        </div>
      </div>
    </Transition>
  </div>
</template>
