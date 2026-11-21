<script setup>
import { onActivated, watch } from 'vue'
import { ArrowPathIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { call, db, log, get } from '../firebase.js'
import { state, cache } from '../model.js'
import { onSnapshot, setDoc, doc } from 'firebase/firestore'
import * as parse from '../utils/parse.js'
import { enrolledLecture } from '../utils/enrolledLecture.mjs'
import { formatFinal } from '../utils/formatFinal.mjs'
import Schedule from '../components/Schedule.vue'
import Registration from '../components/Registration.vue'

let q = $ref(''), qs = $ref([]), data = $ref({}), custom = $ref([])
let finals = $ref(null), finalsIncomplete = $ref(false)
log('web/class')

watch(() => [q, data.schedule, state.user.uid], async ([quarter, schedule, uid], _, onCleanup) => {
  let active = true
  onCleanup(() => { active = false })
  finals = null
  finalsIncomplete = false
  if (!quarter || !schedule || !uid) return

  const results = await Promise.allSettled(Object.entries(schedule)
    .filter(([, entry]) => !entry.isCustomEvent)
    .map(async ([courseId, entry]) => {
      const course = await get('course/' + quarter + courseId)
      const enrollCode = enrolledLecture(course, entry.periods)
      if (!active || !enrollCode) return
      const exam = await call('courseFinal', { quarter, enrollCode })
      return { courseId, ...exam }
    }))

  if (!active) return
  finalsIncomplete = results.some(result => result.status === 'rejected' || !result.value)
  finals = results.flatMap(result => result.value?.hasFinals ? [result.value] : [])
    .sort((a, b) => (a.examDate || '99999999').localeCompare(b.examDate || '99999999') ||
      (a.beginTime || '99:99').localeCompare(b.beginTime || '99:99') ||
      a.courseId.localeCompare(b.courseId))
})

const pieces = $computed(() => {
  const res = []
  if (!data.schedule) return res
  for (const k in data.schedule) {
    const ss = data.schedule[k].session?.substring(5).trim()
    for (const p of data.schedule[k].periods) {
      for (const w of p.wTime) res.push({
        wTime: w, key: k,
        time: p.time.replace(/^(.*?)\s/, ''),
        location: p.location,
        label: ss ? ['Session ' + ss] : []
      })
    }
  }

  // if(custom.length === 0) return res
  for (const c of custom) {
    for (const w of c.wTime) res.push({
      wTime: w, key: 'custom',
      time: c.time.replace(/^(.*?)\s/, ''),
      title: c.title,
      location: c.location,
      label: ['Custom']
    })
  }

  return res
})

// fetch data from server, and write result to local cache
async function fetchData () {
  const quarter = q
  cache.set('class' + quarter, false)

  const token = cache.get('token')
  if (!token) return window.signin('Please verify your identity')
  data = {}
  state.loading = true
  let raw
  try {
    raw = await call('student', { q: quarter, token })
  } finally {
    if (q === quarter) state.loading = false
  }
  if (!raw || cache.get('token') !== token) return
  cache.set('class' + quarter, raw, 86400e6)
  if (q !== quarter) return
  data = raw
  qs = data.quarters
}

let unsub = null
function fetchCustom(){
  // fetch customize schedule
  cache.set('custom' + q, false)

  if(unsub) unsub()

  custom = []
  unsub = onSnapshot(doc(db, `user/${state.user.uid}/schedule/${q}`), doc => {
    const c = doc.data()
    if (!c) return
    custom = JSON.parse(c['+'])
    cache.set('custom' + q, custom, 86400e6)
  })
}

function getData () {

  custom = cache.get('custom' + q)

  if (!custom || custom.length === 0) {
    custom = []
    fetchCustom()
  }

  data = cache.get('class' + q)

  if (!data) {
    data = {}
    fetchData()
  }else{
    qs = data.quarters
  }
  
}

window.onsignin = getData

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function init () {
  if (!state.quarter) {
    state.quarter = (await get('cache/quarter')).current
  }
  q = state.quarter
  //initialize qs
  qs = [parse.quarterLast(q), q, parse.quarterNext(q)]
  await sleep(500)
  if (state.user.uid) getData()
  else window.signin('Please verify your identity')
}

onActivated(init)

// following are about customize schedule
const wTime = (d, hr, min) => d * 1440 + hr * 60 + Number(min)
const days = 'MTWRFSU'
let edit = $ref({})
let ready = $computed(() => {
  if (!edit.title || !edit.time) return false
  const m = edit.time.toUpperCase().match(/^([MTWRFSU ]+)\s*(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/)
  if (!m || m[2] > 23 || m[4] > 23 || m[3] > 59 || m[5] > 59 || wTime(0, m[2], m[3]) >= wTime(0, m[4], m[5])) return false
  const ws = []
  let ds = ''
  for (let d = 0; d < 7; d++) {
    if (!m[1].includes(days[d])) continue
    ds += days[d]
    ws.push([wTime(d, m[2], m[3]), wTime(d, m[4], m[5])])
  }
  if (!ws.length) return false
  return [ws, `${ds} ${m[2]}:${m[3]} - ${m[4]}:${m[5]}`]
})

function submitCustom () {
  setDoc(doc(db, `user/${state.user.uid}/schedule/${q}`), {
    '+': JSON.stringify(custom)
  }, { merge: true })
  //updat the cache data for custom event
  cache.set('custom' + q, custom, 86400e6)
}

function addCustom () {
  if (!ready) return
  custom.push({
    title: edit.title,
    location: edit.location,
    wTime: ready[0],
    time: ready[1]
  })
  submitCustom()
  edit = {}
}

function removeCustom (i) {
  custom.splice(i, 1)
  submitCustom()
}


</script>

<template>
  <div>
    <div class="flex justify-between items-center w-full p-4 pb-2 sm:px-10">
      <div class="flex items-center">
        <h1 class="text-2xl">My Classes</h1>
        <select class="ml-3 px-2 py-1 rounded appearance-none text-sm block shadow bg-white cursor-pointer" v-model="q" @change="getData">
          <option v-for="o in qs" :value="o">{{ parse.quarter(o) }}</option>
        </select>
      </div>
      <ArrowPathIcon class="w-6 text-gray-500 cursor-pointer" @click="fetchData" />
    </div>
    <div class="w-full flex flex-wrap justify-center items-start" v-if="data" :key="q">
      <div class="flex-grow bg-white sm:p-2 sm:pb-4 lg:px-6 pb-4 rounded shadow m-0 sm:m-4 lg:mr-0" v-if="data.schedule"><!-- schedule -->
        <Schedule :pieces="pieces" :quarter='q' whole="1" />
      </div>
      <div class="m-2 w-full lg:w-72 xl:w-80"><!-- side -->
        <div :show="1" v-if="data.schedule" class="p-2">
          <div class="rounded shadow-md bg-white overflow-hidden">
            <div class="text-white font-bold p-2 bg-green-800">Customize Schedule</div>
            <div class="px-2">
              <div class="m-2 flex items-center flex-wrap" v-for="(c, i) in custom">
                <b>{{ c.title }}</b>
                <span class="text-xs text-gray-500 mx-2">{{ c.time }}</span>
                <XCircleIcon class="w-5 text-red-500 cursor-pointer" @click="removeCustom(i)"/>
              </div>
            </div>
            <div class="flex flex-wrap items-center m-2 mb-0">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="Title" v-model="edit.title">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="Location" v-model="edit.location">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="MTWRFSU 08:00 - 23:59" v-model="edit.time">
            </div>
            <p class="text-xs text-gray-500 mx-4">Time format: 24-hour hh:mm</p>
            <button class="all-transition rounded shadow text-white font-bold m-4 mt-2 px-2 py-1" :class="ready ? 'bg-blue-500 hover:shadow-md' : 'bg-gray-300'" @click="addCustom">Add Event</button>
          </div>
        </div>
        <Registration v-if="data.registration" :data="data.registration"/>
        <section v-if="data.schedule && state.user.uid" class="px-2 pb-2" aria-labelledby="final-exams">
          <div class="rounded shadow-md overflow-hidden bg-white">
            <h2 id="final-exams" class="text-white font-bold p-2 bg-[#0b254e]">Final Exams</h2>
            <div class="px-4">
              <p v-if="finals === null" class="my-2 text-sm text-gray-500">Loading finals…</p>
              <template v-else>
                <ul v-if="finals.length">
                  <li v-for="exam in finals" :key="exam.courseId" class="py-2">
                    <b class="block">{{ exam.courseId }}</b>
                    <code class="block overflow-x-auto whitespace-nowrap text-xs">{{ formatFinal(exam) || 'Date and time not listed' }}</code>
                    <p v-if="exam.comments" class="text-sm text-gray-600">{{ exam.comments }}</p>
                  </li>
                </ul>
                <p v-if="finalsIncomplete" class="my-2 text-sm text-gray-600">
                  {{ finals.length ? 'Some final exam details are unavailable.' : 'Final exam details are unavailable.' }}
                </p>
                <p v-else-if="!finals.length" class="my-2 text-sm text-gray-500">No finals listed.</p>
              </template>
            </div>
          </div>
        </section>
      </div>
    </div>
    <p class="m-4" v-else>No data</p>
  </div>
</template>

<style scoped>
code {
  @apply bg-white font-normal;
}
</style>
