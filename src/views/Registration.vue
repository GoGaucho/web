<script setup>
import { RefreshIcon } from '@heroicons/vue/outline'
import { call, db, log } from '../firebase.js'
import { state, cache } from '../model.js'
import { getDoc, doc } from 'firebase/firestore'
import * as parse from '../utils/parse.js'
import * as lookup from '../utils/lookup.js'
import Wrapper from '../components/Wrapper.vue'

let q = $ref(''), qs = $ref([]), data = $ref({})
log('web/registration')

async function fetchData () {
  const token = cache.get('token')
  if (!token) return state.showLogin = true
  data = {}
  state.loading = true
  const raw = await call('student', { _: 'registration', q, token })
  state.loading = false
  if (!raw) return
  data = raw
  cache.set('registration' + q, raw)
}

function getData () {
  data = cache.get('registration' + q)
  if (!data) fetchData()
}
window.onlogin = fetchData

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
    <div class="w-full" v-if="data && data.perm" :key="q">
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