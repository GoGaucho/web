<script setup>
import { RefreshIcon } from '@heroicons/vue/outline'
import { call, db, log } from '../firebase.js'
import { state, cache } from '../model.js'
import { getDoc, doc } from 'firebase/firestore'
import * as parse from '../utils/parse.js'
import * as lookup from '../utils/lookup.js'
import Wrapper from '../components/Wrapper.vue'
import Schedule from '../components/Schedule.vue'

let q = $ref(''), qs = $ref([]), data = $ref({})
log('web/class')

const pieces = $computed(() => {
  const res = []
  if (!data.schedule) return res
  for (const k in data.schedule) {
    for (const p of data.schedule[k].periods) {
      for (const w of p.wTime) res.push({
        wTime: w, key: k,
        time: p.time.replace(/^(.*?)\s/, ''),
        location: p.location
      })
    }
  }
  return res
})

async function fetchData () {
  const token = cache.get('token')
  if (!token) return state.showLogin = true
  data = {}
  state.loading = true
  const raw = await call('student', { q, token })
  state.loading = false
  if (!raw) return
  data = raw
  console.log(raw)
  cache.set('class' + q, raw)
}

function getData () {
  data = cache.get('class' + q)
  if (!data) fetchData()
}
window.onlogin = fetchData

async function init () {
  q = await getDoc(doc(db, 'cache', 'quarter')).then(r => r.data().current)
  qs = [parse.quarterLast(q), q, parse.quarterNext(q)]
  getData()
}
init()
</script>

<template>
  <div>
    <div class="flex justify-between items-center w-full p-4 sm:px-10">
      <div>
        <h1 class="text-2xl">My Classes</h1>
        <select class="p-0 m-0 bg-transparent text-sm block" v-model="q" @change="getData">
          <option v-for="o in qs" :value="o">{{ parse.quarter(o) }}</option>
        </select>
      </div>
      <refresh-icon class="w-6 text-gray-500 cursor-pointer" @click="fetchData" />
    </div>
    <hr>
    <div class="w-full flex flex-wrap justify-center items-start" v-if="data.schedule && data.registration" :key="q">
      <div class="flex-grow bg-white p-2 lg:px-6 rounded shadow m-0 sm:m-4"><!-- schedule -->
        <schedule :pieces="pieces" />
      </div>
      <div class="m-2 w-full lg:w-auto"><!-- registration -->
        <wrapper :show="1" class="p-2">
          <div class="rounded shadow-md overflow-hidden bg-white">
            <div class="text-white font-bold p-2" style="background: #0b254e;">Personal Information</div>
            <div class="mx-4 my-2"><b>Perm Number: </b><code>{{ data.registration.perm }}</code></div>
            <div class="mx-4 my-2"><b>Class Level: </b><code>{{ lookup.classLevel[data.registration.classLevel] }}</code></div>
            <div class="mx-4 my-2"><b>Classification: </b><code>{{ lookup.classification[data.registration.classification] }}</code></div>
          </div>
        </wrapper>
        <wrapper :show="1" class="p-2">
          <div class="rounded shadow-md overflow-hidden bg-white">
            <div class="text-white font-bold p-2" style="background: #0b254e;">Registration</div>
            <div class="mx-4 my-2"><b>Status: </b><code>{{ lookup.regStatus[data.registration.regStatus] }}</code></div>
            <div class="mx-4 my-2"><b>Fee Status: </b><code>{{ lookup.feeStatus[data.registration.feeStatus] }}</code></div>
            <div class="mx-4 my-2"><b>Units: </b><code>{{ data.registration.units }}</code></div>
          </div>
        </wrapper>
        <wrapper :show="1" class="p-2">
          <div class="rounded shadow-md overflow-hidden bg-white">
            <div class="text-white font-bold p-2" style="background: #0b254e;">Pass Time</div>
            <div class="mx-4 my-2"><b>Pass 1: </b><code>{{ data.registration.pass1.replace('T', ' ') }}</code></div>
            <div class="mx-4 my-2"><b>Pass 2: </b><code>{{ data.registration.pass2.replace('T', ' ') }}</code></div>
            <div class="mx-4 my-2"><b>Pass 3: </b><code>{{ data.registration.pass3.replace('T', ' ') }}</code></div>
          </div>
        </wrapper>
      </div>
    </div>
    <p class="m-4" v-else>Currently no data</p>
  </div>
</template>

<style scoped>
code {
  @apply bg-white font-normal;
}
</style>