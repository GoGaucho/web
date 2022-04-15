<script setup>
import { RefreshIcon, XCircleIcon } from '@heroicons/vue/outline'
import { call, db, log } from '../firebase.js'
import { state, cache } from '../model.js'
import { getDoc, onSnapshot, setDoc, doc } from 'firebase/firestore'
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
  const token = cache.get('token')
  if (!token) return window.signin('Please verify your identity')
  data = {}
  state.loading = true
  const raw = await call('student', { q, token })
  state.loading = false
  if (!raw) return
  data = raw
  cache.set('class' + q, raw)
}

let unsub = null
function getData () {
  if (unsub) unsub()
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
window.onsignin = fetchData

async function init () {
  q = await getDoc(doc(db, 'cache', 'quarter')).then(r => r.data().current)
  qs = [parse.quarterLast(q), q, parse.quarterNext(q)]
  getData()
}
init()

// following are about customize schedule
const wTime = (d, hr, min) => d * 1440 + hr * 60 + Number(min)
const days = 'MTWRF'
let edit = $ref({})
let ready = $computed(() => {
  if (!edit.title || !edit.time) return false
  const m = edit.time.toUpperCase().match(/^([MTWRF ]+)\s*(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/)
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
    <div class="flex justify-between items-center w-full p-4 sm:px-10">
      <div>
        <h1 class="text-2xl">My Classes</h1>
        <select class="px-2 border rounded m-0 bg-white appearance-none text-sm block" v-model="q" @change="getData">
          <option v-for="o in qs" :value="o">{{ parse.quarter(o) }}</option>
        </select>
      </div>
      <refresh-icon class="w-6 text-gray-500 cursor-pointer" @click="fetchData" />
    </div>
    <hr>
    <div class="w-full flex flex-wrap justify-center items-start" v-if="data" :key="q">
      <div class="flex-grow bg-white pb-2 sm:p-2 lg:px-6 rounded shadow m-0 sm:m-4" v-if="data.schedule"><!-- schedule -->
        <schedule :pieces="pieces" />
      </div>
      <div class="m-2 w-full lg:w-72"><!-- side -->
        <wrapper :show="1" v-if="data.schedule" class="p-2">
          <div class="rounded shadow-md bg-white">
            <div class="text-white font-bold p-2 bg-green-800">Customize Schedule</div>
            <p class="m-3 text-xs text-gray-500">This feature is still in beta test. Your data might be cleared due to development.</p>
            <div class="px-2">
              <div class="m-2 flex items-center flex-wrap" v-for="(c, i) in custom">
                <b>{{ c.title }}</b>
                <span class="text-xs text-gray-500 mx-2">{{ c.time }}</span>
                <x-circle-icon class="w-5 text-red-500 cursor-pointer" @click="removeCustom(i)"/>
              </div>
            </div>
            <div class="flex flex-wrap items-center m-2">
              <input class="rounded border m-1 px-1" placeholder="Title" v-model="edit.title">
              <input class="rounded border m-1 px-1" placeholder="Location" v-model="edit.location">
              <input class="rounded border m-1 px-1" placeholder="MTWRF 00:00 - 23:59" v-model="edit.time">
            </div>
            <button class="all-transition rounded shadow text-white font-bold m-4 mt-0 px-2 py-1" :class="ready ? 'bg-blue-500 hover:shadow-md' : 'bg-gray-300'" @click="addCustom">Add Event</button>
          </div>
        </wrapper>
        <registration v-if="data.registration" :data="data.registration"/>
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