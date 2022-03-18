<script setup>
import { RefreshIcon } from '@heroicons/vue/outline'
import { call, state, db } from '../firebase.js'
import { getDoc, doc } from 'firebase/firestore'
import Schedule from '../components/Schedule.vue'
import * as parse from '../utils/parse.js'

const LS = window.localStorage
let pieces = $ref([]), q = $ref(''), qs = $ref([])

function getPieces (data) {
  const res = []
  for (const k in data) {
    for (const p of data[k].periods) {
      for (const w of p.wTime) res.push({
        wTime: w, key: k,
        time: p.time.replace(/^(.*?)\s/, ''),
        location: p.location
      })
    }
  }
  return res
}

async function fetchData () {
  pieces = []
  state.loading = 'Loading your schedule...'
  const raw = await call('student', { _: 'schedule', q, token: window.localStorage.token })
  state.loading = false
  if (!raw) return
  pieces = getPieces(raw)
  LS['schedule' + q] = JSON.stringify({ timestamp: Date.now(), pieces })
}

function getData () {
  pieces = []
  if (LS['schedule' + q]) {
    const res = JSON.parse(LS['schedule' + q])
    if (res.timestamp > Date.now() - 604800e3) return pieces = res.pieces
    else delete LS['schedule' + q]
  }
  fetchData()
}

async function init () {
  q = await getDoc(doc(db, 'cache', 'quarter')).then(r => r.data().current)
  qs = [parse.quarterLast(q), q, parse.quarterNext(q)]
  getData()
}
init()
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <div class="mt-4 mx-4 flex justify-between">
      <div>
        <h1 class="text-2xl">Weekly Schedule</h1>
        <select class="p-0 m-0 bg-transparent text-sm block" v-model="q" @change="getData">
          <option v-for="o in qs" :value="o">{{ parse.quarter(o) }}</option>
        </select>
      </div>
      <refresh-icon class="w-6 text-gray-500 cursor-pointer" @click="fetchData" />
    </div>
    <hr class="w-full mt-2">
    <schedule class="flex-grow" :pieces="pieces" :key="q" />
  </div>
</template>