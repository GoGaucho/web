<script setup>
import { watch, reactive } from 'vue'
import { CpuChipIcon } from '@heroicons/vue/24/outline'
import { get, log } from '../firebase.js'
import { state, cache } from '../model.js'
import * as parse from '../utils/parse.js'
import debounce from '../utils/debounce.js'
import * as lookup from '../utils/lookup.js'
import Course from '../components/Course.vue'
import Wrapper from '../components/Wrapper.vue'
import PanelWrapper from '../components/PanelWrapper.vue'
import LabelSwitch from '../components/LabelSwitch.vue'
import Fuse from 'fuse.js'
import { courseFuseOptions, flattenCourseData, fuzzyQuery } from '../utils/fuzz.js'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()
log('web/course')

let loading = $ref(true), list = $ref(null), showCourses = $ref({})
let quarters = $ref([]), focus = $ref(''), flatCourses = [], fuse = null
const query = reactive({
  search: '', college: '', GE: {}
})
const showFocus = $computed(() => Object.keys(state.course.focus).filter(x => state.course.focus[x]).length)

const computeResult = debounce(() => {
  const key = query.search.replaceAll(' ', '').toUpperCase()
  const ges = Object.keys(query.GE).filter(x => query.GE[x]).map(x => query.college + '-' + x)
  const res =  fuzzyQuery(key, fuse, flatCourses)
  showCourses = res.reduce((acc, course) => {
    const key = course.subject
    if (ges.length == 0) {
      if (!acc[key]) acc[key] = []
      acc[key].push(course) 
      return acc
    }
    for (const ge of ges) {
      if (list[key][course.id][1].includes(ge)) {
        if (!acc[key]) acc[key] = []
        acc[key].push(course) 
      }
    }
    return acc
  }, {})
})
watch(query, computeResult)

async function fetchList () {
  loading = true
  list = await get('cache/course.' + state.course.quarter).then(data => JSON.parse(data.data))
  flatCourses = flattenCourseData(list)
  fuse = fuse ? (fuse.setCollection(flatCourses), fuse) : new Fuse(flatCourses, courseFuseOptions)
  computeResult()
  loading = false
}

get('cache/quarter').then(data => {
  quarters = data.course.split(',')
  if (quarters.includes(state.course.quarter)) fetchList()
  else state.course.quarter = quarters[0]
})

watch(
  () => route.query.courseId,
  v => {
    focus = v || ''
  },
  { immediate: true }
)

watch(
  () => state.course.quarter,
  (v, old) => {
    if (!route.query.quarter || v !== route.query.quarter) {
      focus = ''
    }
    state.course.focus = cache.get('course' + v) || {}
    fetchList()
  }
)

watch(() => state.course.focus, v => {
  const res = {}
  for (const k in v) {
    if (v[k]) res[k] = 1
  }
  cache.set('course' + state.course.quarter, res)
}, { deep: true })

watch(() => route.query.quarter, v => {
  if (typeof v === 'string' && v !== state.course.quarter){
    state.course.quarter=v
  }
},
{immediate: true}
)

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
      <Wrapper class="flex items-center flex-wrap px-4 border border-t-0 border-x-0 py-1" :show="showFocus"><!-- focus -->
        <label class="font-bold">Focus:</label>
        <LabelSwitch closable="1" v-for="(v, k) in state.course.focus" @close="delete state.course.focus[k]">{{ k }}</LabelSwitch>
        <button class="text-sm mx-2 my-1 px-4 py-1 rounded-full border font-bold text-blue-500 flex items-center" @click="router.push('/planner')"><CpuChipIcon class="w-4 mr-1" />Go to Planner!</button>
      </Wrapper>
      <div class="flex items-center flex-wrap py-1"><!-- query -->
        <label class="font-bold mx-4 my-1">
          Search: 
          <input class="py-1 px-2 border rounded bg-transparent appearance-none" type="text" v-model="query.search" placeholder="Course ID or Title">
        </label>
        <label class="font-bold mx-4 my-1 flex items-center flex-wrap">
          GE:
          <select class="py-1 px-2 mx-2 border rounded bg-transparent" v-model="query.college" @change="query.GE = {}">
            <option v-for="(v, k) in lookup.GEs">{{ k }}</option>
          </select>
          <div class="flex items-center flex-wrap font-normal">
            <LabelSwitch v-for="g in lookup.GEs[query.college]" v-model="query.GE[g]">{{ g }}</LabelSwitch>
          </div>
        </label>
      </div>
    </div>
    <div class="flex items-start" v-if="!loading">
      <div class="w-full md:w-80 md:mr-6 shadow-md" style="min-width: 20rem;"><!-- course list -->
        <template v-for="(courses, subject) in showCourses"><!-- subject -->
          <PanelWrapper :title="subject + ': ' + lookup.subjects[subject]">
            <template v-for="course in courses">
              <!-- course -->
              <div class="bg-white border p-2 cursor-pointer" @click="focus = course.id">
                <h3 class="pl-2">{{ course.id }}: {{ course.name }}</h3>
              </div>
            </template>
          </PanelWrapper>
        </template>
      </div>
      <Course v-model="focus"
      :quarter="state.course.quarter"/>
    </div>
  </div>
</template>
