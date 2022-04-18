<script setup>
import { watch } from 'vue'
import LabelSwitch from './LabelSwitch.vue'
import Wrapper from './Wrapper.vue'
import state from '../model.js'
const props = defineProps(['pieces'])
const ds = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-sky-500', 'bg-lime-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500']

let colorMap = $ref({}), labels = $ref({})

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
    colorMap[k] = colors[cot++] || 'bg-gray-500'
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
  left: 20 * Math.floor(p.wTime[0] / 1440) + '%',
  top: 0.10417 * (p.wTime[0] % 1440 - 480) + '%',
  height: 0.10417 * (p.wTime[1] - p.wTime[0]) + '%',
  width: '19.5%'
})

let date = $ref(new Date())
let cStyle = $computed(() => {
  const day = date.getDay(), hour = date.getHours(), minute = date.getMinutes()
  if (day < 1 || day > 5 || hour < 8) return { opacity: 0 }
  return {
    left: 20 * (day - 1) + '%',
    top: 0.10417 * (hour * 60 + minute - 480) + '%'
  }
})
setInterval(() => { date = new Date() }, 60e3)
document.onvisibilitychange = () => { date = new Date() }
</script>

<template>
  <div class="w-full h-full relative bg-white overflow-y-auto">
    <wrapper class="flex items-center px-4 py-1" :show="labels && Object.keys(labels).length">
      <label-switch v-for="(v, l) in labels" v-model="labels[l]">{{ l }}</label-switch>
    </wrapper>
    <div class="flex overflow-y-hidden" style="height: 1000px;">
      <div class="mr-1 text-right h-full" style="width: 1rem;"><!-- left -->
        <div style="height: 24px;">&nbsp;</div>
        <div class="grid grid-cols-1 text-right font-mono text-xs text-gray-500" style="height: 976px;"><!-- time axis -->
          <div v-for="i in 16">{{ i + 7 }}</div>
        </div>
      </div>
      <div class="flex-grow overflow-x-auto h-full overflow-y-hidden"><!-- right -->
        <div class="grid grid-cols-5 text-center w-full" style=" height: 24px;">
          <div v-for="d in state.isMobile ? ds : days">{{ d }}</div>
        </div>
        <div class="grid grid-cols-5 gap-px relative w-full" style="height: 976px;"><!-- body -->
          <div v-for="j in 80" class="bg-gray-100" />
          <template v-for="p in props.pieces" :key="p.key">
            <div v-if="!isHide(p)" :style="pStyle(p)" class="all-transition absolute p-1 text-xs rounded overflow-hidden hover:opacity-30 hover:ring">
              <div class="font-bold text-shadow text-[0.7rem] sm:text-xs">{{ p.title || p.key }}</div>
              <div class="text-gray-700 text-[0.6rem] sm:text-xs">{{ p.time }}</div>
              <div class="text-gray-700 text-[0.625rem] sm:text-xs">{{ p.location }}</div>
              <div class="all-transition absolute bottom-0 top-0 left-0 w-0.5" :class="colorMap[p.key]" />
              <div class="absolute bottom-0 top-0 left-0 right-0 opacity-20" :class="colorMap[p.key]" />
            </div>
          </template>
          <div class="flex items-center absolute bg-blue-500 h-0.5 w-1/5" :style="cStyle" />
        </div>
      </div>
    </div>
  </div>
</template>
