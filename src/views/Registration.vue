<script setup>
import { call, state, db } from '../firebase.js'
import { getDoc, doc } from 'firebase/firestore'
import * as parse from '../utils/parse.js'
import * as lookup from '../utils/lookup.js'

let q = $ref(''), qs = $ref([]), data = $ref({})
state.loading = 'Loading...'

async function fetchData () {
  state.loading = 'Loading...'
  const raw = await call('student', { _: 'registration', q, token: window.localStorage.token })
  state.loading = false
  data = raw
}

async function init () {
  q = await getDoc(doc(db, 'cache', 'quarter')).then(r => r.data().current)
  qs = [q, parse.quarterNext(q)]
  fetchData()
}
init()
</script>

<template>
  <div class="p-4 sm:p-10 h-full flex flex-col items-start bg-white">
    <div class="mb-4">
      <h1 class="text-2xl">Registration</h1>
      <select class="p-0 m-0 bg-transparent text-sm block" v-model="q" @change="fetchData">
        <option v-for="o in qs" :value="o">{{ parse.quarter(o) }}</option>
      </select>
    </div>
    <table class="table-auto font-bold">
      <tr>
        <td>Perm Number:</td>
        <td><code>{{ data.perm }}</code></td>
      </tr>
      <tr>
        <td>Class Level:</td>
        <td><code>{{ lookup.classLevel[data.classLevel] }}</code></td>
      </tr>
      <tr>
        <td>Classification:</td>
        <td><code>{{ lookup.classification[data.classification] }}</code></td>
      </tr>
      <tr>
        <td>Status:</td>
        <td><code>{{ lookup.regStatus[data.regStatus] }}</code></td>
      </tr>
      <tr>
        <td>Fee Status:</td>
        <td><code>{{ lookup.feeStatus[data.feeStatus] }}</code></td>
      </tr>
      <tr>
        <td>Units:</td>
        <td><code>{{ data.units }}</code></td>
      </tr>
      <tr>
        <td>Pass 1:</td>
        <td><code>{{ data.pass1.replace('T', ' ') }}</code></td>
      </tr>
      <tr>
        <td>Pass 2:</td>
        <td><code>{{ data.pass2.replace('T', ' ') }}</code></td>
      </tr>
      <tr>
        <td>Pass 3:</td>
        <td><code>{{ data.pass3.replace('T', ' ') }}</code></td>
      </tr>
    </table>
  </div>
</template>

<style scoped>
code {
  @apply bg-white font-normal;
}
</style>