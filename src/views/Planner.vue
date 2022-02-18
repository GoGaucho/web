<script setup>
import { ArrowLeftIcon, ChipIcon } from '@heroicons/vue/outline'
import { getDoc, doc } from 'firebase/firestore'
import { db, state } from '../firebase.js'
import PanelWrapper from '../components/PanelWrapper.vue'
import { useRouter } from 'vue-router'
const router = useRouter(), focus = state.course.focus

let loading = $ref(true), choices = $ref({}), chosenwTime = $ref([])
const sections = {}, courses = [], colors = ['bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-sky-500', 'bg-orange-500', 'bg-teal-500']
async function fetchData () {
  if (!focus) return router.push('/course')
  for (const k in focus) if (!focus[k]) delete focus[k]
  if (!Object.keys(focus).length) return router.push('/course')
  for (const k in focus) {
    const c = await getDoc(doc(db, 'course', state.course.quarter + k)).then(r => r.data())
    focus[k] = c
    choices[k] = {}
    c.color = colors[courses.length]
    courses.push(k)
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
  if (testConflict(sections[lec].wTime, k)) return 'conflict'
  return 'ok'
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
  if (testConflict(sections[lec].wTime, k) || testConflict(sections[sec].wTime, k)) return 'conflict'
  return 'ok'
}
function chooseSEC (k, lec, sec) {
  if (choices[k].sec === sec) choices[k] = { lec: choices[k].lec }
  else {
    choices[k].lec = lec
    choices[k].sec = sec
    choices[k].done = 1
  }
}

const periodStyle = (wTime, k) => ({
  left: 20 * Math.floor(wTime[0] / 1440) + '%',
  top: 0.10417 * (wTime[0] % 1440 - 480) + '%',
  height: 0.10417 * (wTime[1] - wTime[0]) + '%',
  width: '19%',
  color: testConflict([wTime], k) ? 'red' : ''
})
let periods = $computed(() => {
  const res = []
  for (const k in choices) {
    const lec = choices[k].lec, sec = choices[k].sec
    if (lec) for (const wTime of sections[lec].wTime) res.push({ style: periodStyle(wTime, k), code: lec, course: k })
    if (sec) for (const wTime of sections[sec].wTime) res.push({ style: periodStyle(wTime, k), code: sec, course: k })
  }
  return res
})

// dfs search for a solution
function dfsLEC (i) {
  if (i === courses.length) return true
  const k = courses[i], choice = choices[k], course = focus[k]
  if (choice.lec) return dfsSEC(i)
  for (const lec in course.tree) {
    if (testConflict(sections[lec].wTime)) continue
    chooseLEC(k, lec)
    if (dfsSEC(i)) return true
    chooseLEC(k, lec)
  }
}
function dfsSEC (i) {
  const k = courses[i], choice = choices[k], course = focus[k], lec = choice.lec
  if (choice.done) return dfsLEC(i + 1)
  for (const sec of course.tree[lec]) {
    if (testConflict(sections[sec].wTime)) continue
    chooseSEC(k, lec, sec)
    if (dfsLEC(i + 1)) return true
    chooseLEC(k, lec, sec)
  }
}

function auto (i) {
  if (dfsLEC(0)) Swal.fire('Success', 'Found a solution!', 'success')
  else Swal.fire('Failed', 'There is no solution', 'error')
}
</script>

<template>
  <div class="bg-yellow-200 text-yellow-700 p-2">This page is still under development. For old version GoGaucho GOLD, <a href="https://web.gogaucho.app/gold/" class="underline">click here</a></div>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl flex items-center mb-4">
      <button class="cursor-pointer" @click="router.push('/course')"><arrow-left-icon class="all-transition w-12 pl-2 pr-3 hover:pl-0 hover:pr-5" /></button>
      Planner
    </h1>
    <p v-if="loading" class="text-sm text-gray-500 mb-4">Loading...</p>
    <div class="my-2 flex items-center">
      <button class="mx-2 my-1 px-4 py-2 rounded-full shadow-md font-bold text-white bg-blue-500 flex items-center" @click="auto"><chip-icon class="w-4 mr-1" />Auto Choose</button>
    </div>
    <div class="flex items-start overflow-x-auto" style="min-height: 70vh;">
      <div class="overflow-x-auto shadow-md" style="min-width: 420px;">
        <!-- course list -->
        <panel-wrapper v-if="!loading" v-for="(v, k) in focus" :title="k" :class="choices[k]?.done ? 'bg-blue-100' : 'bg-gray-100'">
          <table v-if="v.tree" class="w-full text-center">
            <tr>
              <th>Code</th>
              <th>Instructor</th>
              <th>Days</th>
              <th>Time</th>
              <th>Location</th>
            </tr>
            <template v-for="(ss, lec) in v.tree">
              <tr class="border-white bg-gray-200 border-y-1 all-transition cursor-pointer" :set="s = v.sections[lec]" :class="classLEC(k, lec)" @click="chooseLEC(k, lec)"><!-- lecture -->
                <td>{{ lec }}</td>
                <td><div v-for="i in s.instructors">{{ i }}</div></td>
                <td><div v-for="p in s.periods">{{ p.days }}</div></td>
                <td><div v-for="p in s.periods">{{ p.time }}</div></td>
                <td><div v-for="p in s.periods">{{ p.location }}</div></td>
              </tr>
              <tr class="opacity-60 bg-gray-200 border-white border border-x-0 all-transition cursor-pointer" v-for="sec in ss" :set="s = v.sections[sec]" :class="classSEC(k, lec, sec)" @click="chooseSEC(k, lec, sec)">
                <td>{{ sec }}</td>
                <td><div v-for="i in s.instructors">{{ i }}</div></td>
                <td><div v-for="p in s.periods">{{ p.days }}</div></td>
                <td><div v-for="p in s.periods">{{ p.time }}</div></td>
                <td><div v-for="p in s.periods">{{ p.location }}</div></td>
              </tr>
            </template>
          </table>
        </panel-wrapper>
      </div>
      <div class="relative flex-grow bg-white shadow-md ml-4 grid grid-cols-5 gap-px" style="min-width: 400px; min-height: 70vh;">
        <template v-for="i in 16">
          <div class="bg-gray-100 text-xs text-gray-500">{{ i + 7 }}:00</div>
          <div v-for="j in 4" class="bg-gray-100" />
        </template>
        <div class="all-transition absolute text-white font-bold p-1 text-xs border shadow-md text-shadow" :class="focus[p.course].color" v-for="p in periods" :key="p.course" :style="p.style">
          {{ p.course }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chosen {
  @apply bg-blue-200 font-bold;
}
.conflict {
  @apply bg-red-200 line-through;
}
.ok {
  @apply bg-green-200;
}
.text-shadow {
  text-shadow: 1px 1px black;
}
</style>