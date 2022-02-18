<script setup>
import { getDoc, doc } from 'firebase/firestore'
import { db, state } from '../firebase.js'
import PanelWrapper from '../components/PanelWrapper.vue'
import { useRouter } from 'vue-router'
const router = useRouter(), focus = state.course.focus

let loading = $ref(true), choices = $ref({}), chosenwTime = $ref([])
const sections = {}
async function fetchData () {
  if (!focus) return router.push('/course')
  for (const k in focus) if (!focus) delete focus[k]
  if (!Object.keys(focus).length) return router.push('/course')
  for (const k in focus) {
    const c = await getDoc(doc(db, 'course', state.course.quarter + k)).then(r => r.data())
    focus[k] = c
    choices[k] = {}
    for (const s in c.sections) {
      sections[s] = c.sections[s]
      sections[s].wTime = JSON.parse(sections[s].wTime)
    }
  }
  loading = false
}
fetchData()

function isOverlap (a, b) {
  for (const x of a) {
    for (const y of b) {
      if (x[1] >= y[0] && x[0] <= y[1]) return true
    }
  }
  return false
}

function testConflict (wTime, exception = '') {
  for (const k in choices) {
    if (k === exception) continue
    if (choices[k].lec && isOverlap(sections[choices[k].lec].wTime, wTime)) return true
    if (choices[k].sec && isOverlap(sections[choices[k].sec].wTime, wTime)) return true
  }
}

function classLEC (k, lec) {
  if (choices[k].lec === lec) return 'chosen'
  if (!testConflict(sections[lec].wTime, k)) return 'ok'
  return ''
}
function chooseLEC (k, lec) {
  if (choices[k].lec) choices[k] = {}
  else {
    choices[k].lec = lec
    if (!focus[k].tree[lec]?.length) choices[k].done = 1
  }
}

function classSEC (k, lec, sec) {
  if (choices[k].sec === sec) return 'chosen'
  if (!testConflict(sections[lec].wTime, k) && !testConflict(sections[sec].wTime, k)) return 'ok'
  return ''
}
function chooseSEC (k, lec, sec) {
  if (choices[k].sec === sec) choices[k] = { lec: choices[k].lec }
  else {
    choices[k].lec = lec
    choices[k].sec = sec
    choices[k].done = 1
  }
}
</script>

<template>
  <div class="bg-yellow-200 text-yellow-700 p-2">This page is still under development. For old version GoGaucho GOLD, <a href="https://web.gogaucho.app/gold/" class="underline">click here</a></div>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl flex items-center mb-4">Planner</h1>
    <p v-if="loading" class="text-sm text-gray-500 mb-4">Loading...</p>
    <p class="text-sm text-gray-500 mb-4">Weekly view is coming!</p>
    <panel-wrapper v-if="!loading" v-for="(v, k) in focus" :title="k" :class="choices[k]?.done ? 'bg-blue-100' : 'bg-gray-100'">
      <div class="w-full overflow-x-auto">
        <table v-if="v.tree" class="w-full text-center" style="min-width: 450px;">
          <tr>
            <th>Code</th>
            <th>Instructor</th>
            <th>Days</th>
            <th>Time</th>
            <th>Location</th>
          </tr>
          <template v-for="(ss, lec) in v.tree">
            <tr class="border-white bg-gray-200 border-y-1 all-transition" :set="s = v.sections[lec]" :class="classLEC(k, lec)" @click="chooseLEC(k, lec)"><!-- lecture -->
              <td>{{ lec }}</td>
              <td><div v-for="i in s.instructors">{{ i }}</div></td>
              <td><div v-for="p in s.periods">{{ p.days }}</div></td>
              <td><div v-for="p in s.periods">{{ p.time }}</div></td>
              <td><div v-for="p in s.periods">{{ p.location }}</div></td>
            </tr>
            <tr class="opacity-60 bg-gray-200 border-white border border-x-0 all-transition" v-for="sec in ss" :set="s = v.sections[sec]" :class="classSEC(k, lec, sec)" @click="chooseSEC(k, lec, sec)">
              <td>{{ sec }}</td>
              <td><div v-for="i in s.instructors">{{ i }}</div></td>
              <td><div v-for="p in s.periods">{{ p.days }}</div></td>
              <td><div v-for="p in s.periods">{{ p.time }}</div></td>
              <td><div v-for="p in s.periods">{{ p.location }}</div></td>
            </tr>
          </template>
        </table>
      </div>
    </panel-wrapper>
  </div>
</template>

<style scoped>
.chosen {
  @apply bg-blue-200;
}
.ok {
  @apply bg-green-200;
}
</style>