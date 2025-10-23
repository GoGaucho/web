<script setup>
import { watch } from 'vue'
import LabelSwitch from './LabelSwitch.vue'
import Toggle from './Toggle.vue'
import state from '../model.js'
import { MapPinIcon } from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
import { classrooms } from '../utils/locations.js'

const props = defineProps(['pieces', 'whole'])
const ds = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const colors = [
  ['bg-yellow-500', 'text-yellow-700'],
  ['bg-purple-500', 'text-purple-700'],
  ['bg-red-500', 'text-red-700'],
  ['bg-green-500', 'text-green-700'],
  ['bg-sky-500', 'text-sky-700'],
  ['bg-lime-500', 'text-lime-700'],
  ['bg-orange-500', 'text-orange-700'],
  ['bg-teal-500', 'text-teal-700'],
  ['bg-pink-500', 'text-pink-700']
]

let colorMap = $ref({}), labels = $ref({}), showTime = $ref(true), twelveHour = $ref(false);

watch(() => props.pieces, v => {
  const keys = new Set()
  let ls = new Set()
  for (const p of v) {
    keys.add(p.key)
    if (p.label?.length) ls.add(...p.label)
  }
  // remove old
  colorMap = {}
  labels = {}
  // add new
  let cot = 0
  for (const k of keys) {
    colorMap[k] = colors[cot++] || ['bg-gray-500', 'text-gray-700']
  }
  ls = [...ls].sort()
  for (const l of ls) {
    if (typeof labels[l] === 'undefined') labels[l] = 1
  }
}, { immediate: true })

const isHide = p => {
  if (!p) return true
  if (!p.label) return false
  for (const l of p.label) {
    if (!labels[l]) return true
  }
  return false
}

const pStyle = p => ({
  left: 14.286 * Math.floor(p.wTime[0] / 1440) + '%',
  top: 0.10417 * (p.wTime[0] % 1440 - 480) + '%',
  height: 0.10417 * (p.wTime[1] - p.wTime[0]) + '%',
  width: '14%'
})

const twelvify = time => time
  .split(' - ')
  .map(e => {
    let hour = parseInt(e.split(':')[0])
    return `${hour > 12 ? hour - 12: hour}:${e.split(':')[1]} ${hour >= 12 ? 'PM' : 'AM'}`
  }).join(' - ');

let date = $ref(new Date())
let cStyle = $computed(() => {
  const day = date.getDay(), hour = date.getHours(), minute = date.getMinutes()
  if (day < 1 || day > 5 || hour < 8) return { opacity: 0 }
  return {
    width: '14%',
    left: 14.286 * (day - 1) + '%',
    top: 0.10417 * (hour * 60 + minute - 480) + '%',
    marginTop: '-0.2rem'
  }
})

// Class to map redirect
const locate = location => {
  if (classrooms[location]) router.push('/map?q=' + location)
}

setInterval(() => { date = new Date() }, 60e3)
document.onvisibilitychange = () => { date = new Date() }
</script>

<template>
  <div class="w-full h-full relative bg-white overflow-y-auto">
    <div class="flex items-start justify-between p-2 pb-1 pr-0">
      <div class="flex items-center flex-wrap">
        <LabelSwitch v-for="(v, l) in labels" v-model="labels[l]">{{ l }}</LabelSwitch>
      </div>
      <div>
        <Toggle v-model="twelveHour" class="scale-75 -mr-2 whitespace-nowrap">12 hr time</Toggle>
        <Toggle v-model="showTime" class="scale-75 -mr-2 whitespace-nowrap">More details</Toggle>
      </div>
    </div>
    <div class="flex overflow-y-hidden">
      <div class="mr-1 text-right h-full select-none" style="width: 1rem;"><!-- left -->
        <div style="height: 24px;">&nbsp;</div>
        <div class="grid grid-cols-1 text-right font-mono text-xs text-gray-500 all-transition" :style="{ height: showTime ? '976px' : '736px' }"><!-- time axis -->
          <div v-for="i in 16">{{ i > 5 && twelveHour ? i - 5 : i + 7}}</div> 
        </div>
      </div>
      <div class="flex-grow h-full overflow-y-hidden" :class="props.whole ? 'overflow-x-auto' : 'overflow-x-hidden'"><!-- right -->
        <div class="grid grid-cols-7 text-center w-full select-none" :style="{ width: state.screen.md || !props.whole ? '140%' : '100%', height: '24px' }">
          <div v-for="d in state.screen.md ? ds : days">{{ d }}</div>
        </div>
        <div class="grid grid-cols-7 gap-px relative w-full overflow-y-hidden all-transition" :style="{ width: state.screen.md || !props.whole ? '140%' : '100%', height: showTime ? '976px' : '736px' }"><!-- body -->
          <div v-for="j in 112" class="all-transition bg-gray-100 hover:bg-gray-50 rounded" />
          <template v-for="p in props.pieces">
            <div v-if="!isHide(p)" :style="pStyle(p)" class="all-transition absolute p-1 text-xs rounded-r-sm overflow-hidden">
              <div class="font-semibold text-shadow text-[0.7rem] sm:text-xs" :class="colorMap[p.key][1]">{{ p.title || p.key }}</div>
              <div class="text-[0.6rem] sm:text-xs opacity-90" :class="colorMap[p.key][1]" v-if="showTime">{{ twelveHour ? twelvify(p.time) : p.time }}</div>
              <div class="text-[0.625rem] sm:text-xs opacity-90" :class="colorMap[p.key][1]" @click="locate(p.location)"">{{ p.location }}</div>
              <div class="all-transition absolute bottom-0 top-0 left-0 w-0.5" :class="colorMap[p.key][0]" />
              <div class="absolute bottom-0 top-0 left-0 right-0" :class="colorMap[p.key][0]" style="opacity: 15%;"/>
            </div>
          </template>
          <div class="flex items-center absolute" :style="cStyle">
            <div class="rounded-full bg-blue-500" style="width: 0.4rem; height: 0.4rem; margin-left: -0.15rem; margin-right: 0.08rem;" />
            <div class="h-0.5 rounded bg-blue-500" style="width: calc(100% - 0.2rem);" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
