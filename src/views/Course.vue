<script setup>
import { watch, reactive } from 'vue'
import { XIcon, ChipIcon } from '@heroicons/vue/outline'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { state } from '../model.js'
import * as parse from '../utils/parse.js'
import debounce from '../utils/debounce.js'
import * as lookup from '../utils/lookup.js'
import Course from '../components/Course.vue'
import Wrapper from '../components/Wrapper.vue'
import PanelWrapper from '../components/PanelWrapper.vue'
import Instructor from '../components/Instructor.vue'
import { useRouter } from 'vue-router'
const router = useRouter()

let loading = $ref(true), list = $ref(null), hideList = $ref({}), showSub = $ref({}), subjects = $ref([])
let quarters = $ref([]), focus = $ref('')
const query = reactive({
  search: '', subject: '', college: '', GE: {}
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
  showSub = {}
  const key = query.search.replaceAll(' ', '').toUpperCase()
  const ges = Object.keys(query.GE).filter(x => query.GE[x]).map(x => query.college + '-' + x)
  for (const sub in list) {
    if (query.subject && query.subject !== sub) continue
    let hasOne = false
    for (const k in list[sub]) {
      hideList[k] = isHide(k, list[sub][k], key, ges)
      if (!hideList[k]) hasOne = true
    }
    if (hasOne) showSub[sub] = 0
  }
  if (Object.keys(showSub).length === 1) showSub[Object.keys(showSub)[0]] = 1
})
watch(query, computeResult)

async function fetchList () {
  loading = true
  list = await getDoc(doc(db, 'cache', 'course.' + state.course.quarter)).then(r => JSON.parse(r.data().data))
  subjects = Object.keys(list).sort()
  computeResult()
  loading = false
}

getDoc(doc(db, 'cache', 'quarter')).then(r => {
  quarters = r.data().course.split(',')
  if (quarters.includes(state.course.quarter)) fetchList()
  else state.course.quarter = quarters[0]
})

// load instructors
state.course.instructor = ''
if (!state.course.instructors) getDoc(doc(db, 'cache', 'instructor')).then(r => { state.course.instructors = JSON.parse(r.data()?.data || '{}') })

watch(() => state.course.quarter, async v => {
  focus = false
  state.course.focus = {}
  fetchList()
})
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl flex items-center mb-4">
      Course
      <select class="text-base bg-white border mx-2 px-4 py-1 rounded-full appearance-none cursor-pointer" v-if="quarters.length" v-model="state.course.quarter">
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
        <button class="text-sm mx-2 my-1 px-4 py-1 rounded-full border font-bold text-blue-500 flex items-center" @click="router.push('/planner')"><chip-icon class="w-4 mr-1" />Go to Planner!</button>
      </wrapper>
      <div class="flex items-center flex-wrap py-1"><!-- query -->
        <label class="font-bold mx-4 my-1">
          Search: 
          <input class="py-1 px-2 border rounded bg-transparent appearance-none" type="text" v-model="query.search" placeholder="Course ID or Title">
        </label>
        <select class="py-1 px-2 border rounded bg-transparent mx-4 my-1" v-model="query.subject">
          <option value="">All subjects</option>
          <option v-for="s in subjects" :value="s">{{ s }}: {{ lookup.subjects[s] }}</option>
        </select>
        <label class="font-bold mx-4 my-1 flex items-center flex-wrap">
          GE:
          <select class="py-1 px-2 mx-2 border rounded bg-transparent" v-model="query.college" @change="query.GE = {}">
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
        <template v-for="sub in subjects"><!-- subject -->
          <panel-wrapper v-if="showSub[sub] > -1" :title="sub + ': ' + lookup.subjects[sub]" v-model="showSub[sub]">
            <template v-for="(v, k) in list[sub]">
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
    <instructor></instructor>
  </div>
</template>
