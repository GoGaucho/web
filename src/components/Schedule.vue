<script setup>
const props = defineProps(['pieces'])
let isMobile = $ref(false)
window.onresize = () => { isMobile = window.innerWidth < 768 }
window.onresize()
const ds = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const colors = ['bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-sky-500', 'bg-lime-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500']
let colorMap = $computed(() => {
  let cot = 0
  const res = {}
  for (const p of props.pieces) {
    if (!res[p.key]) res[p.key] = colors[cot++] || 'bg-gray-500'
  }
  return res
})
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
setInterval(() => { const date = new Date() }, 30e3)
</script>

<template>
  <div class="w-full h-full p-2 relative bg-white overflow-y-auto flex items-stretch">
    <div class="flex flex-col mr-1 text-right" style="min-height: 1000px; min-width: 1rem;"><!-- left -->
      <div class="text-right">&nbsp;</div>
      <div class="flex-grow grid grid-cols-1 text-right font-mono text-xs text-gray-500"><!-- time axis -->
        <div v-for="i in 16">{{ i + 7 }}</div>
      </div>
    </div>
    <div class="flex-grow flex flex-col overflow-x-auto" style="min-height: 1000px;"><!-- right -->
      <div class="grid grid-cols-5 text-center" style="min-width: 440px;">
        <div v-for="d in isMobile ? ds : days">{{ d }}</div>
      </div>
      <div class="flex-grow grid grid-cols-5 gap-px relative" style="min-width: 440px;"><!-- body -->
        <div v-for="j in 80" class="bg-gray-100" />
        <div v-for="p in props.pieces" :style="pStyle(p)" :key="p.key" class="all-transition absolute p-1 sm:px-2 text-xs rounded overflow-hidden">
          <div class="font-bold text-shadow">{{ p.key }}</div>
          <div class="text-gray-700">{{ p.time }}</div>
          <div class="text-gray-700">{{ p.location }}</div>
          <div class="all-transition absolute bottom-0 top-0 left-0 w-0.5 sm:w-1" :class="colorMap[p.key]" />
          <div class="absolute bottom-0 top-0 left-0 right-0 opacity-20" :class="colorMap[p.key]" />
        </div>
        <div class="flex items-center absolute bg-blue-500 h-0.5 w-1/5" :style="cStyle" />
      </div>
    </div>
  </div>
</template>
