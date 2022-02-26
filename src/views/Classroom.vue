<script setup>
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/outline'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'
import * as parse from '../utils/parse.js'

let data = $ref(undefined), quarter = $ref(''), capacity = $ref({})
let building = $ref(''), day = $ref(3), buildings = $ref([])
const date = new Date(), days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
day = (date.getDay() + 6) % 7
const now = date.getHours()*60 + date.getMinutes() + day * 1440

getDoc(doc(db, 'cache', 'classroom')).then(r => {
  const raw = r.data()
  data = JSON.parse(raw.data)
  buildings = Object.keys(data).sort()
  quarter = parse.quarter(raw.quarter)
  capacity = JSON.parse(raw.capacity)
})

// 8:00 - 24:00
const scale = w => (w - day*1440 - 480) / 9.6 + '%'
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl flex items-center">
      Classroom in 
      <select class="m-2 text-xl border bg-white" v-if="data" v-model="building">
        <option v-for="k in buildings">{{ k }}</option>
      </select>
    </h1>
    <p class="text-sm text-gray-500 mb-4">{{ quarter || 'Loading...' }}</p>
    <label v-if="data && building" class="flex items-center w-min font-bold bg-white  rounded-full shadow-md select-none">
      <chevron-left-icon class="w-5 m-2 cursor-pointer text-gray-500" @click="day = (day+6)%7"/>
      {{ days[day] }}
      <chevron-right-icon class="w-5 m-2 cursor-pointer text-gray-500" @click="day = (day+1)%7"/>
    </label>
    <p v-if="data && building" class="mt-3">Timeline goes from <code>08:00</code> to <code>23:59</code></p>
    <div class="w-full h-2 relative mb-4">
      <div v-for="i in 16" class="absolute bg-white text-xs" :style="{ left: 6.25*(i-1) + '%', width: '6%' }">{{ i+7 }}</div>
    </div>
    <div v-if="data && building" v-for="(ps, room) in data[building]" class="w-full relative my-2 pb-2 font-bold overflow-hidden">
      {{ building }} {{ room }}
      <span class="text-sm text-gray-500 font-normal ml-2" v-if="capacity[building][room]">capacity: {{ capacity[building][room] }}</span>
      <div v-for="i in 16" class="absolute bg-white bottom-1 h-1" :style="{ left: 6.25*(i-1) + '%', width: '6%' }" />
      <div v-for="(len, st) in ps" class="absolute bg-red-400 bottom-1 h-1 slow-transition" :style="{ left: scale(st), width: len/9.6 + '%' }" />
      <div class="absolute bg-blue-500 bottom-0 h-3 w-3 rounded-full slow-transition" :style="{ left: scale(now) }" />
    </div>
  </div>
</template>

<style scoped>
.slow-transition {
  transition: all 0.7s ease;
}
</style>
