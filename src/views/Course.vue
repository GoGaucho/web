<script setup>
import { watch } from 'vue'
import { getDoc, doc } from 'firebase/firestore'
import { db, log } from '../firebase.js'
import * as parse from '../utils/parse.js'
import debounce from '../utils/debounce.js'
import Course from '../components/Course.vue'

log('course')

let loading = $ref(true), list = $ref(null), showList = $ref({})
let quarters = $ref([]), quarter = $ref(''), search = $ref(''), focus = $ref('')

const computeResult = debounce(() => {
  showList = {}
  if (!search) return showList = JSON.parse(JSON.stringify(list))
  const key = search.toUpperCase()
  for (const k in list) if (k.includes(key)) showList[k] = list[k]
  for (const k in list) if (list[k].includes(key)) showList[k] = list[k]
})

getDoc(doc(db, 'cache', 'quarter')).then(r => {
  quarters = r.data().course
  quarter = quarters[0]
  loading = false
})

watch($$(quarter), async v => {
  loading = true
  focus = false
  list = await getDoc(doc(db, 'cache', 'course.' + v)).then(r => JSON.parse(r.data().data))
  showList = JSON.parse(JSON.stringify(list))
  loading = false
})

watch($$(search), computeResult)
</script>

<template>
  <div class="bg-yellow-200 text-yellow-700 p-2">This page is still under development. For old version GoGaucho GOLD, <a href="https://web.gogaucho.app/gold/" class="underline">click here</a></div>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl flex items-center">
      Course
      <select class="text-base bg-white border mx-2 px-2 py-1 rounded-full" v-if="quarters.length" v-model="quarter">
        <option v-for="q in quarters" :value="q">{{ parse.quarter(q) }}</option>
      </select>
    </h1>
    <p v-if="loading" class="text-sm text-gray-500 mb-4">Loading...</p>
    <input class="my-4 bg-white rounded shadow-md py-2 px-3" type="text" v-model="search" placeholder="Search Course ID or Title">
    <div class="flex items-start" v-if="!loading">
      <div class="w-full md:w-80 md:mr-6 shadow-md" style="min-width: 20rem;">
        <div class="bg-white border p-2 cursor-pointer" v-for="(v, k) in showList" @click="focus = k">
          <h3 class="font-bold">{{ k }}: {{ v }}</h3>
        </div>
      </div>
      <course v-model="focus" :quarter="quarter" />
    </div>
  </div>
</template>
