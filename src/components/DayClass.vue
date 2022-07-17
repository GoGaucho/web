<script setup>
import { onActivated, watch } from 'vue'
import { state, cache } from '../model.js'
import { classrooms } from '../utils/locations.js'
import { LocationMarkerIcon } from '@heroicons/vue/outline'
import { useRouter } from 'vue-router'
const router = useRouter()
let classes = $ref(false)

function getClasses () {
  if (!state.user.name) return false
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

onActivated(getClasses)
watch(() => state.quarter, getClasses)

function locate (location) {
  router.push('/map?q=' + location)
}
</script>

<template>
  <div class="mb-4 sm:mb-8 relative h-24 flex items-center w-full overflow-x-auto overflow-y-hidden">
    <transition name="fade" mode="out-in">
      <button v-if="!classes" class="bg-blue-500 rounded px-4 py-2 font-bold text-white all-transition shadow hover:shadow-md" @click="router.push('/class')">Load your classes</button>
      <div v-else class="h-full flex items-center">
        <div v-for="c in classes" class="border-2 p-2 mx-2 h-full" style="border-color: #0b254e; min-width: 10rem;">
          <div>
            <b>{{ c.course }}</b>
            <span class="text-xs ml-1" v-if="c.session">(session {{ c.session }})</span>
          </div>
          <div class="text-sm flex items-center" :class="classrooms[c.location] && 'cursor-pointer'" @click="locate(c.location)">
            {{ c.location }}
            <location-marker-icon class="ml-1 w-5 text-gray-500" v-if="classrooms[c.location]" />
          </div>
          <div class="text-sm">{{ c.time }}</div>
        </div>
        <div class="mx-2">
          <div v-if="classes && !classes.length">You don't have classes today! 👻</div>
          <button v-if="classes" class="bg-white rounded px-4 py-2 my-2 all-transition text-blue-500 font-bold shadow hover:shadow-md whitespace-nowrap" @click="router.push('/class')">Full Schedule ></button>
        </div>
      </div>
    </transition>
  </div>
</template>