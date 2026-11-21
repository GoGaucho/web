<script setup>
import { onActivated, onDeactivated, watch } from 'vue'
import { ArrowPathIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { call, db, log, get } from '../firebase.js'
import { state, cache, getSchoolToken, studentCacheKey } from '../model.js'
import { getAuth } from 'firebase/auth'
import { onSnapshot, runTransaction, doc } from 'firebase/firestore'
import * as parse from '../utils/parse.js'
import Schedule from '../components/Schedule.vue'
import Registration from '../components/Registration.vue'

let q = $ref(''), qs = $ref([]), data = $ref({}), custom = $ref([])
let loadedQuarter = $ref(''), loading = $ref(false)
let customQuarter = $ref(''), customError = $ref('')
let loadedUser = $ref('')
let classError = $ref(''), needsSignIn = $ref(false), customSaving = $ref(false), saveError = $ref('')
let dataRequest = 0, customRequest = 0
let active = false, unsub = null
const canEditCustom = $computed(() => !!state.user.uid && customQuarter === q && !customSaving)
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
  const requestedQuarter = q, requestedUser = state.user.uid, request = ++dataRequest
  loadedQuarter = ''
  classError = ''
  needsSignIn = false
  if (!requestedQuarter || !requestedUser) return
  const user = getAuth().currentUser
  const token = user?.uid === requestedUser && getSchoolToken(user)
  if (!token) {
    loading = false
    state.loading = false
    needsSignIn = true
    return
  }
  const isCurrent = () => active && request === dataRequest && requestedQuarter === q &&
    requestedUser === state.user.uid && requestedUser === getAuth().currentUser?.uid
  loading = true
  state.loading = true
  try {
    const raw = await call('student', { q: requestedQuarter, token })
    if (!isCurrent()) return
    if (!Array.isArray(raw?.quarters)) throw new Error('Missing schedule')
    data = raw
    qs = data.quarters
    loadedQuarter = requestedQuarter
    loadedUser = requestedUser
    cache.set(studentCacheKey('class', requestedUser, requestedQuarter), raw)
  } catch {
    if (isCurrent()) classError = 'Could not load your classes.'
  } finally {
    if (request === dataRequest) {
      loading = false
      state.loading = false
    }
  }
}

function readCustomEvents (snapshot) {
  const raw = snapshot.data()?.['+']
  if (raw === undefined) return []
  const events = JSON.parse(raw)
  if (!Array.isArray(events) || events.some(event => typeof event?.title !== 'string' ||
    typeof event.time !== 'string' || !Array.isArray(event.wTime) || event.wTime.some(w => !Array.isArray(w) || w.length !== 2 || !w.every(Number.isInteger)))) {
    throw new Error('Invalid custom events')
  }
  return events
}

function fetchCustom () {
  const requestedQuarter = q, requestedUser = state.user.uid
  const request = ++customRequest
  customQuarter = ''
  customError = ''
  unsub?.()
  if (!requestedQuarter || !requestedUser) return
  const isCurrent = () => active && request === customRequest && requestedQuarter === q && requestedUser === state.user.uid
  const failed = () => {
    if (!isCurrent()) return
    customQuarter = ''
    customError = 'Custom events could not be loaded. Try again before editing or exporting.'
  }
  unsub = onSnapshot(doc(db, `user/${requestedUser}/schedule/${requestedQuarter}`), { includeMetadataChanges: true }, snapshot => {
    if (!isCurrent()) return
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
      customQuarter = ''
      return
    }
    try {
      custom = readCustomEvents(snapshot)
      cache.set(studentCacheKey('custom', requestedUser, requestedQuarter), custom)
      customQuarter = requestedQuarter
      customError = ''
    } catch { failed() }
  }, failed)
}

function resetData () {
  dataRequest++
  customRequest++
  loadedQuarter = ''
  loadedUser = ''
  customQuarter = ''
  customError = ''
  classError = ''
  saveError = ''
  customSaving = false
  needsSignIn = false
  edit = {}
  data = {}
  custom = []
  loading = false
  state.loading = false
  if (unsub) {
    unsub()
    unsub = null
  }
}

function getData () {
  resetData()
  const uid = state.user.uid
  if (!active || !uid || !q) return
  custom = cache.get(studentCacheKey('custom', uid, q)) || []
  fetchCustom()
  data = cache.get(studentCacheKey('class', uid, q)) || {}
  if (Array.isArray(data.quarters)) qs = data.quarters
  fetchData()
}

watch(() => state.user.uid, () => {
  if (active) getData()
}, { flush: 'sync' })

async function init () {
  active = true
  window.onsignin = getData
  try {
    if (!state.quarter) {
      const quarter = await get('cache/quarter')
      if (!active) return
      state.quarter = quarter.current
    }
    q = state.quarter
    qs = [parse.quarterLast(q), q, parse.quarterNext(q)]
    getData()
  } catch {
    if (active) classError = 'Could not load the current quarter.'
  }
}

onActivated(init)
onDeactivated(() => {
  active = false
  resetData()
})

function signInForClasses () {
  window.signin('Please verify your identity')
}

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

async function submitCustom (update) {
  if (!canEditCustom) return false
  const uid = state.user.uid, quarter = q, request = customRequest
  const isCurrent = () => active && request === customRequest && state.user.uid === uid && q === quarter && getAuth().currentUser?.uid === uid
  const ref = doc(db, `user/${uid}/schedule/${quarter}`)
  customSaving = true
  saveError = ''
  try {
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref)
      if (!isCurrent()) throw new Error('Schedule changed')
      const next = update(readCustomEvents(snapshot))
      transaction.set(ref, { '+': JSON.stringify(next) }, { merge: true })
    })
    if (!isCurrent()) return false
    customSaving = false
    // Require a fresh server snapshot after the committed change before another edit or export.
    fetchCustom()
    return true
  } catch {
    if (isCurrent()) saveError = 'Could not save your custom event. Try again.'
    return false
  } finally {
    if (isCurrent()) customSaving = false
  }
}

async function addCustom () {
  if (!ready) return
  const event = {
    title: edit.title,
    location: edit.location,
    wTime: ready[0],
    time: ready[1]
  }
  if (await submitCustom(events => [...events, event])) edit = {}
}

function removeCustom (i) {
  const event = JSON.stringify(custom[i])
  submitCustom(events => {
    const index = events.findIndex(current => JSON.stringify(current) === event)
    if (index !== -1) events.splice(index, 1)
    return events
  })
}


</script>

<template>
  <div>
    <div class="flex flex-wrap justify-between items-center gap-3 w-full p-4 pb-2 sm:px-10">
      <div class="flex flex-wrap gap-y-2 items-center">
        <h1 class="text-2xl">My Classes</h1>
        <select class="ml-3 px-2 py-1 rounded appearance-none text-sm block shadow bg-white cursor-pointer" v-model="q" @change="getData">
          <option v-for="o in qs" :value="o">{{ parse.quarter(o) }}</option>
        </select>
        <div class="ml-3">
        </div>
      </div>
      <button type="button" aria-label="Refresh classes" :disabled="loading || !state.user.uid" @click="fetchData"><ArrowPathIcon class="w-6 text-gray-500" /></button>
    </div>
    <p v-if="!state.user.uid || needsSignIn" class="mx-4 mb-2 text-sm sm:mx-10">
      <button type="button" class="underline" @click="signInForClasses">Sign in to load your classes</button>
    </p>
    <p v-if="classError" class="mx-4 mb-2 text-sm text-red-700 sm:mx-10" role="alert">{{ classError }} <button type="button" class="underline" @click="q ? fetchData() : init()">Retry</button></p>
    <p v-if="customError" class="mx-4 mb-2 text-sm text-red-700 sm:mx-10" role="alert">{{ customError }} <button type="button" class="underline focus-visible:ring-2 focus-visible:ring-blue-500" :disabled="customSaving" @click="fetchCustom">Retry</button></p>
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
                <button type="button" :aria-label="'Remove ' + c.title" :disabled="!canEditCustom" @click="removeCustom(i)"><XCircleIcon class="w-5 text-red-500" /></button>
              </div>
            </div>
            <div class="flex flex-wrap items-center m-2 mb-0">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="Title" v-model="edit.title">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="Location" v-model="edit.location">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="MTWRFSU 08:00 - 23:59" v-model="edit.time">
            </div>
            <p class="text-xs text-gray-500 mx-4">Time format: 24-hour hh:mm</p>
            <p v-if="saveError" role="alert" class="mx-4 text-sm text-red-700">{{ saveError }}</p>
            <button class="all-transition rounded shadow text-white font-bold m-4 mt-2 px-2 py-1 bg-blue-500 disabled:bg-gray-300" :disabled="!ready || !canEditCustom" @click="addCustom">{{ customSaving ? 'Saving…' : 'Add Event' }}</button>
          </div>
        </div>
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
