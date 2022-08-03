<script setup>
import { onActivated } from 'vue'
import { RefreshIcon, XCircleIcon } from '@heroicons/vue/outline'
import { call, db, log, get } from '../firebase.js'
import { state, cache } from '../model.js'
import { onSnapshot, setDoc, doc } from 'firebase/firestore'
import * as parse from '../utils/parse.js'
import Wrapper from '../components/Wrapper.vue'
import Schedule from '../components/Schedule.vue'
import Registration from '../components/Registration.vue'

let q = $ref(''), qs = $ref([]), data = $ref({}), custom = $ref([])
log('web/class')

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

async function fetchData () {
  cache.set('class' + q, false)
  const token = cache.get('token')
  if (!token) return window.signin('Please verify your identity')
  data = {}
  state.loading = true
  const raw = await call('student', { q, token })
  state.loading = false
  if (!raw) return
  data = raw
  cache.set('class' + q, raw, 86400e6)
}

let unsub = null
function getData () {
  if (unsub) unsub()
  custom = []
  // fetch customize
  unsub = onSnapshot(doc(db, `user/${state.user.uid}/schedule/${q}`), doc => {
    const c = doc.data()
    if (!c) return
    custom = JSON.parse(c['+'])
  })
  data = cache.get('class' + q)
  if (!data) {
    data = {}
    fetchData()
  }
}
window.onsignin = getData

async function init () {
  if (!state.quarter) {
    state.quarter = (await get('cache/home')).quarter.current
  }
  q = state.quarter
  qs = [parse.quarterLast(q), q, parse.quarterNext(q)]
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
      <RefreshIcon class="w-6 text-gray-500 cursor-pointer" @click="fetchData" />
    </div>
    <div class="w-full flex flex-wrap justify-center items-start" v-if="data" :key="q">
      <div class="flex-grow bg-white sm:p-2 sm:pb-4 lg:px-6 pb-4 rounded shadow m-0 sm:m-4" v-if="data.schedule"><!-- schedule -->
        <Schedule :pieces="pieces" whole="1" />
      </div>
      <div class="m-2 w-full lg:w-80"><!-- side -->
        <Wrapper :show="1" v-if="data.schedule" class="p-2">
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
        </Wrapper>
        <Registration v-if="data.registration" :data="data.registration"/>
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