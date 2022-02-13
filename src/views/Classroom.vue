<script setup>
import { getDoc, doc } from 'firebase/firestore'
import { db, log } from '../firebase.js'
import * as parse from '../utils/parse.js'

let data = $ref(undefined), quarter = $ref('')
let building = $ref(''), day = $ref(3)
const date = new Date(), W = 9, S = 420 // 7:00 - 22:00
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
day = (date.getDay() + 6) % 7
getDoc(doc(db, 'cache', 'classroom')).then(r => {
  const raw = r.data()
  data = JSON.parse(raw.data)
  quarter = parse.quarter(raw.quarter)
})
log('classroom')

function getPeriods (ps) {
  const res = []
  for (const st in ps) {
    if (Math.floor(st / 1440) != day) continue
    res.push(`left: ${(st%1440-S)/W}%; width: ${ps[st]/W}%;`)
  }
  return res
}

const currentStyle = `left: ${(date.getHours()*60 + date.getMinutes() - S) / W}%;`
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl flex items-center">
      Classroom in 
      <select class="m-2 text-xl border bg-white" v-if="data" v-model="building">
        <option v-for="(v, k) in data">{{ k }}</option>
      </select>
    </h1>
    <p class="text-sm text-gray-500 mb-4">{{ quarter || 'Loading...' }}</p>
    <label class="font-bold bg-white py-2 px-4 rounded-full shadow-md">Day 
      <select v-if="data" v-model="day">
        <option v-for="(d, i) in days" :value="i">{{ d }}</option>
      </select>
    </label>
    <div class="mt-6" v-if="data && building">
      <div v-for="(ps, room) in data[building]" class="w-full relative my-2 font-bold">
        {{ building }} {{ room }}
        <div class="absolute bg-gray-200 bottom-0 h-1 w-full" :style="p" />
        <div v-for="p in getPeriods(ps)" class="absolute bg-red-400 bottom-0 h-1" :style="p" />
        <div class="absolute bg-blue-500 -bottom-1 h-3 w-3 rounded-full" :style="currentStyle" />
      </div>
    </div>
  </div>
</template>
