<script setup>
import { RefreshIcon } from '@heroicons/vue/outline'
import { call, state, db } from '../firebase.js'
import { getDoc, doc } from 'firebase/firestore'
import * as parse from '../utils/parse.js'
import * as lookup from '../utils/lookup.js'
import Wrapper from '../components/Wrapper.vue'

const LS = window.localStorage
let q = $ref(''), qs = $ref([]), data = $ref({})

async function fetchData () {
  data = {}
  state.loading = 'Loading...'
  const raw = await call('student', { _: 'registration', q, token: LS.token })
  state.loading = false
  data = raw
  LS['registration' + q] = JSON.stringify({ timestamp: Date.now(), data })
}

function getData () {
  data = {}
  if (LS['registration' + q]) {
    const res = JSON.parse(LS['registration' + q])
    if (res.timestamp > Date.now() - 604800e3) return data = res.data
    else delete LS['registration' + q]
  }
  fetchData()
}

async function init () {
  q = await getDoc(doc(db, 'cache', 'quarter')).then(r => r.data().current)
  qs = [q, parse.quarterNext(q)]
  getData()
}
init()
</script>

<template>
  <div class="p-4 sm:p-10 h-full">
    <div class="flex justify-between items-center w-full">
      <div>
        <h1 class="text-2xl">Registration Info.</h1>
        <select class="p-0 m-0 bg-transparent text-sm block" v-model="q" @change="getData">
          <option v-for="o in qs" :value="o">{{ parse.quarter(o) }}</option>
        </select>
      </div>
      <refresh-icon class="w-6 text-gray-500 cursor-pointer" @click="fetchData" />
    </div>
    <hr class="my-4">
    <div class="w-full">
      <wrapper :show="1" class="p-2">
        <div class="rounded shadow-md overflow-hidden bg-white">
          <div class="text-white font-bold p-2" style="background: #0b254e;">Personal Information</div>
          <div class="mx-4 my-2"><b>Perm Number: </b><code>{{ data.perm }}</code></div>
          <div class="mx-4 my-2"><b>Class Level: </b><code>{{ lookup.classLevel[data.classLevel] }}</code></div>
          <div class="mx-4 my-2"><b>Classification: </b><code>{{ lookup.classification[data.classification] }}</code></div>
        </div>
      </wrapper>
      <wrapper :show="1" class="p-2">
        <div class="rounded shadow-md overflow-hidden bg-white">
          <div class="text-white font-bold p-2" style="background: #0b254e;">Registration</div>
          <div class="mx-4 my-2"><b>Status: </b><code>{{ lookup.regStatus[data.regStatus] }}</code></div>
          <div class="mx-4 my-2"><b>Fee Status: </b><code>{{ lookup.feeStatus[data.feeStatus] }}</code></div>
          <div class="mx-4 my-2"><b>Units: </b><code>{{ data.units }}</code></div>
        </div>
      </wrapper>
      <wrapper :show="1" class="p-2">
        <div class="rounded shadow-md overflow-hidden bg-white">
          <div class="text-white font-bold p-2" style="background: #0b254e;">Pass Time</div>
          <div class="mx-4 my-2"><b>Pass 1: </b><code>{{ data.pass1.replace('T', ' ') }}</code></div>
          <div class="mx-4 my-2"><b>Pass 2: </b><code>{{ data.pass2.replace('T', ' ') }}</code></div>
          <div class="mx-4 my-2"><b>Pass 3: </b><code>{{ data.pass3.replace('T', ' ') }}</code></div>
        </div>
      </wrapper>
    </div>
  </div>
</template>

<style scoped>
code {
  @apply bg-white font-normal;
}
</style>