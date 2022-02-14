<script setup>
import { watch, reactive } from 'vue'
import { getDoc, doc } from 'firebase/firestore'
import { db, log } from '../firebase.js'
import * as parse from '../utils/parse.js'
import debounce from '../utils/debounce.js'
import Course from '../components/Course.vue'
import PanelWrapper from '../components/PanelWrapper.vue'

log('course')

let loading = $ref(true), list = $ref(null), hideList = $ref({}), showDept = $ref({})
let quarters = $ref([]), quarter = $ref(''), focus = $ref('')
const query = reactive({
  search: '', department: ''
})

const computeResult = debounce(() => {
  hideList = {}
  const key = query.search.toUpperCase()
  for (const dept in list) {
    if (query.department && query.department !== dept) {
      hideList[dept] = 1
      continue
    }
    let hasOne = false
    for (const k in list[dept]) {
      if (!k.includes(key) && !list[dept][k][0].includes(key)) hideList[k] = 1
      else hasOne = true
    }
    if (!hasOne) hideList[dept] = 1
  }
  if (query.department) showDept[query.department] = 1
})
watch(query, computeResult)

getDoc(doc(db, 'cache', 'quarter')).then(r => {
  quarters = r.data().course
  quarter = quarters[0]
  loading = false
})

watch($$(quarter), async v => {
  loading = true
  focus = false
  list = await getDoc(doc(db, 'cache', 'course.' + v)).then(r => JSON.parse(r.data().data))
  hideList = {}
  loading = false
})
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
    <div class="flex items-center flex-wrap bg-white my-4 rounded shadow-md py-1"><!-- query -->
      <label class="font-bold mx-4 my-1">
        Search: 
        <input class="py-1 px-2 border rounded" type="text" v-model="query.search" placeholder="Search Course ID or Title">
      </label>
      <label class="font-bold mx-4 my-1">
        Department:
        <select class="py-1 px-2 border rounded" v-model="query.department">
          <option value="">All</option>
          <option v-for="(v, dept) in list">{{ dept }}</option>
        </select>
      </label>
    </div>
    <div class="flex items-start" v-if="!loading">
      <div class="w-full md:w-80 md:mr-6 shadow-md" style="min-width: 20rem;"><!-- course list -->
        <template v-for="(courses, dept) in list">
          <!-- department -->
          <panel-wrapper v-if="!hideList[dept]" :title="dept" v-model="showDept[dept]">
            <template v-for="(v, k) in courses">
              <!-- course -->
              <div class="bg-white border p-2 cursor-pointer" v-if="!hideList[k]" @click="focus = k">
                <h3 class="pl-2">{{ k }}: {{ v[0] }}</h3>
              </div>
            </template>
          </panel-wrapper>
        </template>
      </div>
      <course v-model="focus" :quarter="quarter" />
    </div>
  </div>
</template>
