<script setup>
import { onActivated, watch } from 'vue'
import { state, cache } from '../model.js'
import { classrooms } from '../utils/locations.js'
import { MapPinIcon, AcademicCapIcon } from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
const router = useRouter()
let classes = $ref(false)
let tip = $ref(''), displayTime = $ref(''), target = $ref(0), targetClass = $ref(null)

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
          time: p.time.replace(/^(.*?)\s/, ''),
          current: false,
          next: false
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

function currentwTime () {
  const date = new Date()
  const day = date.getDay(), hour = date.getHours(), minute = date.getMinutes()
  return (day - 1) * 1440 + hour * 60 + minute
}

// following for countdown
function updateStatus () {
  const wTime = currentwTime()
  let t = Infinity // target
  if (!classes || !classes.length) return
  for (const c of classes) { // check current class
    c.next = false
    c.current = c.wTime[0] <= wTime && wTime <= c.wTime[1]
    if (c.current && c.wTime[1] < t) {
      t = c.wTime[1]
      targetClass = c
    }
  }
  if (t < Infinity) {
    tip = 'Current Class 📖'
    target = t
    return
  }
  for (const c of classes) {
    if (c.wTime[0] > wTime) {
      c.next = true
      t = c.wTime[0]
      targetClass = c
      break
    }
  }
  if (t < Infinity) {
    tip = 'Next Class 🚀'
    target = t
  } else tip = 'All Clear Today! 🥳'
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function tick () {
  while (1) {
    const wTime = currentwTime()
    const delta = target - wTime - 1
    if (delta < 0) displayTime = ''
    else {
      const hr = Math.trunc(delta / 60).toString(), min = Math.trunc(delta % 60).toString(), sec = Math.trunc(59 - new Date().getSeconds()).toString()
      displayTime = `${hr.padStart(2, '0')}:${min.padStart(2, '0')}:${sec.padStart(2, '0')}`
    }
    updateStatus()
    await sleep(1000 - (Date.now() - 500) % 1000)
  }
}
tick()
</script>

<template>
  <div class="mb-4 sm:mb-8 -mx-6 sm:mx-0 sm:max-w-full relative h-36 flex items-center overflow-x-auto bg-white sm:rounded border">
    <Transition name="fade" mode="out-in">
      <button v-if="!classes" class="bg-blue-500 rounded-full mx-10 px-4 py-2 font-bold text-white all-transition shadow hover:shadow-md" @click="router.push('/class')">Load your classes</button>
      <div v-else class="h-full flex flex-col">
        <div class="flex items-center mt-2 mx-4">
          <h4 class="text-lg font-bold">{{ tip }}</h4>
          <button v-if="classes" class="bg-white rounded-full px-2 py-1 mx-2 all-transition text-blue-500 flex items-center border hover:bg-gray-100 whitespace-nowrap text-sm" @click="router.push('/class')"><AcademicCapIcon class="w-5 mr-1" />Weekly Schedule</button>
        </div>
        <div class="grow flex items-center m-2"><!-- course list -->
          <div v-if="displayTime" class="mx-2 flex flex-col items-start">
            <span class="text-sm">{{ targetClass.course }}<span v-if="targetClass.session">(session {{ targetClass.session }})</span></span>
            <span class="font-mono text-4xl font-bold">{{ displayTime }}</span>
            <div class="text-sm flex items-center" :class="classrooms[targetClass.location] && 'cursor-pointer'" @click="locate(targetClass.location)">
              {{ targetClass.location }}
              <MapPinIcon class="ml-1 w-5 text-gray-500" v-if="classrooms[targetClass.location]" />
            </div>
          </div>
          <div v-for="c in classes" class="relative rounded-r-sm p-2 mx-1 h-full overflow-hidden w-40 all-transition" :class="c.current ? 'bg-red-50' : (c.next ? 'bg-yellow-50' : 'bg-blue-50')"><!-- course card -->
            <div>
              <b>{{ c.course }}</b>
              <span class="text-xs ml-1" v-if="c.session">(session {{ c.session }})</span>
            </div>
            <div class="text-sm flex items-center" :class="classrooms[c.location] && 'cursor-pointer'" @click="locate(c.location)">
              {{ c.location }}
              <MapPinIcon class="ml-1 w-5 text-gray-500" v-if="classrooms[c.location]" />
            </div>
            <div class="text-sm">{{ c.time }}</div>
            <div class="all-transition absolute bottom-0 top-0 left-0 w-0.5" :class="c.current ? 'bg-red-500' : (c.next ? 'bg-yellow-500' : 'bg-blue-500')" />
          </div>
          <div v-if="classes && !classes.length">You don't have classes today! 👻</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
