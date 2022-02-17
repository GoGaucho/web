<script setup>
import { watch, reactive } from 'vue'
import { XIcon, ChipIcon } from '@heroicons/vue/outline'
import { getDoc, doc } from 'firebase/firestore'
import { db, state } from '../firebase.js'
import * as parse from '../utils/parse.js'
import debounce from '../utils/debounce.js'
import * as lookup from '../utils/lookup.js'
import Course from '../components/Course.vue'
import Wrapper from '../components/Wrapper.vue'
import PanelWrapper from '../components/PanelWrapper.vue'

let loading = $ref(true), list = $ref(null), hideList = $ref({}), showDept = $ref({}), departments = $ref([])
let quarters = $ref([]), focus = $ref('')
const query = reactive({
  search: '', department: '', college: '', GE: {}, refresh: 0
})
const showFocus = $computed(() => Object.keys(state.course.focus).filter(x => state.course.focus[x]).length)

function isHide (k, v, key, ges) {
  for (const g of ges) {
    if (!v[1].includes(g)) return true
  }
  if (!k.includes(key) && !v[0].includes(key)) return true
}

const computeResult = debounce(() => {
  hideList = {}
  showDept = {}
  const key = query.search.toUpperCase()
  const ges = Object.keys(query.GE).filter(x => query.GE[x]).map(x => query.college + '-' + x)
  for (const dept in list) {
    if (query.department && query.department !== dept) continue
    let hasOne = false
    for (const k in list[dept]) {
      hideList[k] = isHide(k, list[dept][k], key, ges)
      if (!hideList[k]) hasOne = true
    }
    if (hasOne) showDept[dept] = 0
  }
  if (Object.keys(showDept).length === 1) showDept[Object.keys(showDept)[0]] = 1
})
watch(query, computeResult)

getDoc(doc(db, 'cache', 'quarter')).then(r => {
  quarters = r.data().course
  state.course.quarter = quarters[0]
  state.course.focus = {}
  loading = false
})

watch(() => state.course.quarter, async v => {
  loading = true
  focus = false
  list = await getDoc(doc(db, 'cache', 'course.' + v)).then(r => JSON.parse(r.data().data))
  departments = Object.keys(list).sort()
  query.refresh++
  loading = false
})
</script>

<template>
  <div class="bg-yellow-200 text-yellow-700 p-2">This page is still under development. For old version GoGaucho GOLD, <a href="https://web.gogaucho.app/gold/" class="underline">click here</a></div>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl flex items-center mb-4">
      Course
      <select class="text-base bg-white border mx-2 px-2 py-1 rounded-full" v-if="quarters.length" v-model="state.course.quarter">
        <option v-for="q in quarters" :value="q">{{ parse.quarter(q) }}</option>
      </select>
    </h1>
    <p v-if="loading" class="text-sm text-gray-500 mb-4">Loading...</p>
    <div class="bg-white my-4 rounded border" v-if="!loading">
      <wrapper class="flex items-center flex-wrap px-4 border border-t-0 border-x-0 py-1" :show="showFocus"><!-- focus -->
        <label class="font-bold">Focus:</label>
        <template v-for="(v, k) in state.course.focus">
          <label v-if="state.course.focus[k]" class="all-transition border text-sm rounded px-1 m-1 border-blue-400 text-blue-400 bg-blue-100 flex items-center">{{ k }}<x-icon class="w-4 cursor-pointer" @click="state.course.focus[k] = false" /></label>
        </template>
        <button class="text-sm mx-2 my-1 px-4 py-1 rounded-full border font-bold text-blue-500 flex items-center"><chip-icon class="w-4 mr-1" />Planner is coming soon!</button>
      </wrapper>
      <div class="flex items-center flex-wrap py-1"><!-- query -->
        <label class="font-bold mx-4 my-1">
          Search: 
          <input class="py-1 px-2 border rounded bg-white" type="text" v-model="query.search" placeholder="Course ID or Title">
        </label>
        <label class="font-bold mx-4 my-1">
          Department:
          <select class="py-1 px-2 border rounded bg-white" v-model="query.department">
            <option value="">All</option>
            <option v-for="dept in departments" :value="dept">{{ dept }} - {{ lookup.departments[dept] }}</option>
          </select>
        </label>
        <label class="font-bold mx-4 my-1 flex items-center flex-wrap">
          GE:
          <select class="py-1 px-2 mx-2 border rounded bg-white" v-model="query.college" @change="query.GE = {}">
            <option v-for="(v, k) in lookup.GEs">{{ k }}</option>
          </select>
          <div>
            <button v-for="g in lookup.GEs[query.college]" class="all-transition border text-sm rounded px-1 m-1" :class="query.GE[g] ? 'border-orange-400 text-orange-400 bg-orange-100' : 'border-blue-400 text-blue-400 bg-blue-100'" @click="query.GE[g] = !query.GE[g]">{{ g }}</button>
          </div>
        </label>
      </div>
    </div>
    <div class="flex items-start" v-if="!loading">
      <div class="w-full md:w-80 md:mr-6 shadow-md" style="min-width: 20rem;"><!-- course list -->
        <template v-for="dept in departments"><!-- department -->
          <panel-wrapper v-if="showDept[dept] > -1" :title="dept + ' - ' + lookup.departments[dept]" v-model="showDept[dept]">
            <template v-for="(v, k) in list[dept]">
              <!-- course -->
              <div class="bg-white border p-2 cursor-pointer" v-if="!hideList[k]" @click="focus = k">
                <h3 class="pl-2">{{ k }}: {{ v[0] }}</h3>
              </div>
            </template>
          </panel-wrapper>
        </template>
      </div>
      <course v-model="focus" />
    </div>
  </div>
</template>
