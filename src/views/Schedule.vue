<script setup>
import { watch } from 'vue'
import { call, state, db } from '../firebase.js'
import { getDoc, doc } from 'firebase/firestore'
import Schedule from '../components/Schedule.vue'
import * as parse from '../utils/parse.js'

const LS = window.localStorage
let quarter = $ref('Loading'), data = $ref({})
getDoc(doc(db, 'cache', 'quarter')).then(r => { quarter = parse.quarter(r.data().current) })

watch($$(data), v => {
  LS.schedule = JSON.stringify(v)
})

async function fetch () {
  if (!state.token) return
  const raw = await call('student', { token: state.token })
  if (!raw) return
  data = raw
}
watch(() => state.token, fetch, { immediate: true })
if (LS.schedule) data = JSON.parse(LS.schedule)

let pieces = $computed(() => {
  const res = []
  for (const k in data) {
    for (const p of data[k].periods) {
      for (const w of p.wTime) res.push({
        wTime: w, key: k,
        content: `${p.time.replace(/^(.*?)\s/, '')}<br>${p.location}`
      })
    }
  }
  return res
})
</script>

<template>
  <div class="p-4 sm:p-10 h-full flex flex-col">
    <h1 class="text-2xl">Weekly Schedule</h1>
    <p class="text-sm text-gray-500">{{ quarter }}</p>
    <schedule class="flex-grow my-4 shadow-md" :pieces="pieces" />
  </div>
</template>