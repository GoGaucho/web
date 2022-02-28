<script setup>
import { ArrowLeftIcon, ChipIcon, InformationCircleIcon } from '@heroicons/vue/outline'
import { getDoc, doc } from 'firebase/firestore'
import { db, state } from '../firebase.js'
import PanelWrapper from '../components/PanelWrapper.vue'
import Schedule from '../components/Schedule.vue'
import { useRouter } from 'vue-router'
const router = useRouter(), focus = state.course.focus

let loading = $ref(true), choices = $ref({}), chosenwTime = $ref([])
const sections = {}, courses = [], conflicts = {}, colors = ['bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-sky-500', 'bg-orange-500', 'bg-teal-500']
async function fetchData () {
  if (!focus) return router.push('/course')
  for (const k in focus) if (!focus[k]) delete focus[k]
  if (!Object.keys(focus).length) return router.push('/course')
  for (const k in focus) {
    const c = focus[k] = await getDoc(doc(db, 'course', state.course.quarter + k)).then(r => r.data())
    focus[k] = c
    choices[k] = {}
    c.color = colors[courses.length]
    courses.push(k)
    for (const s in c.sections) {
      sections[s] = c.sections[s]
      sections[s].wTime = JSON.parse(sections[s].wTime)
    }
  }
  function isOverlap (a, b) {
    for (const x of a) {
      for (const y of b) if (x[1] >= y[0] && x[0] <= y[1]) return true
    }
  }
  for (const x in sections) {
    conflicts[x] = {}
    for (const y in sections) {
      conflicts[x][y] = isOverlap(sections[x].wTime, sections[y].wTime)
    }
  }
  computeStatus()
  loading = false
}
fetchData()

function isConflict (_choices, s, exception = '') {
  for (const k in _choices) {
    if (k === exception) continue
    if (_choices[k].lec && conflicts[_choices[k].lec][s]) return true
    if (_choices[k].sec && conflicts[_choices[k].sec][s]) return true
  }
}

// dfs search for a solution
function dfsLEC (_choices, i) {
  if (i === courses.length) return true
  const k = courses[i], c = _choices[k], tree = focus[k].tree
  if (c.lec) return dfsSEC(_choices, i)
  for (const lec in tree) {
    if (isConflict(_choices, lec, k)) continue
    c.lec = lec
    if (dfsSEC(_choices, i)) return true
  }
}
function dfsSEC (_choices, i) {
  const k = courses[i], c = _choices[k], tree = focus[k].tree
  if (c.sec || !Object.keys(tree[c.lec]).length) return dfsLEC(_choices, i + 1)
  for (const sec of tree[c.lec]) {
    if (isConflict(_choices, sec)) continue
    c.sec = sec
    if (dfsLEC(_choices, i + 1)) return true
  }
}

// computation-intensive
function computeStatus () {
  const template = JSON.stringify(choices)
  for (const k in choices) {
    for (const lec in focus[k].tree) {
      const ls = sections[lec] // lecture
      if (choices[k].lec === lec) ls.status = 'chosen'
      else if (isConflict(choices, lec, k)) ls.status = 'conflict'
      else {
        const simulate = JSON.parse(template)
        simulate[k] = { lec }
        ls.status = dfsLEC(simulate, 0) ? 'ok' : 'potential'
      }
      for (const sec of focus[k].tree[lec]) {
        const ss = sections[sec] // section
        if (choices[k].sec === sec) ss.status = 'chosen'
        else if (isConflict(choices, sec, k)) ss.status = 'conflict'
        else if (ls.status === 'potential') ss.status = 'potential'
        else {
          const simulate = JSON.parse(template)
          simulate[k] = { lec, sec }
          ss.status = dfsLEC(simulate, 0) ? 'ok' : 'potential'
        }
      }
    }
  }
}

// user make choice
function choose (k, lec, sec) {
  if (!sec) {
    if (choices[k].lec === lec) choices[k] = {}
    else choices[k].lec = lec
    if (choices[k].lec && !focus[k].tree[lec]?.length) choices[k].done = 1
  } else {
    if (choices[k].sec === sec) choices[k] = { lec: choices[k].lec }
    else choices[k] = { lec, sec, done: 1 }
  }
  computeStatus()
}

let pieces = $computed(() => {
  const res = []
  for (const k in choices) {
    const lec = choices[k].lec, sec = choices[k].sec
    if (lec) for (const wTime of sections[lec].wTime) res.push({ wTime, key: k })
    if (sec) for (const wTime of sections[sec].wTime) res.push({ wTime, key: k })
  }
  return res
})

function auto () {
  function scan () {
    for (const k in choices) {
      const c = choices[k]
      if (c.done) continue
      if (c.lec) {
        for (const sec of focus[k].tree[c.lec]) {
          if (sections[sec].status === 'ok') {
            choose(k, c.lec, sec)
            return true
          }
        }
      } else {
        for (const lec in focus[k].tree) {
          if (sections[lec].status === 'ok') {
            choose(k, lec)
            return true
          }
        }
      }
    }
  }
  while (scan()) {}
}

function help () {
  Swal.fire({
    title: 'GoGaucho Planner',
    html: `
    <div class="text-left">
      <p>You can choose sections on the left. There are four possible statuses for each section, they are:</p>
      <p class="mt-2 bg-blue-200 font-bold">This is the chosen one</p>
      <p class="bg-green-200">Everything is OK</p>
      <p class="bg-red-200 line-through">Conflicts with chosen schedule</p>
      <p class="bg-yellow-200 italic">Guarantee conflicts in the future</p>
      <p class="mt-2"><em>Note: you CAN choose sections with conflicts. Don't forget to double check conflicts (marked with red text) on the schedule!</em></p>
      <p class="mt-4"><b>Auto Choose</b> will automatically choose one solution for you. It will not touch your chosen ones, but try it best to find a solution for undecided ones.</p>
    </div>`
  })
}
</script>

<template>
  <div class="p-4 sm:p-10 min-h-full bg-white">
    <h1 class="text-2xl flex items-center mb-4">
      <button class="cursor-pointer" @click="router.push('/course')"><arrow-left-icon class="all-transition w-12 pl-2 pr-3 hover:pl-0 hover:pr-5" /></button>
      Planner
    </h1>
    <p v-if="loading" class="text-sm text-gray-500 mb-4">Loading...</p>
    <div class="my-2 flex items-center">
      <button class="mx-2 my-1 px-4 py-2 rounded-full shadow-md font-bold text-white bg-blue-500 flex items-center" @click="auto"><chip-icon class="w-4 mr-1" />Auto Choose</button>
      <button class="text-gray-500 flex items-center ml-2" @click="help"><information-circle-icon class="w-4 mr-1" />Help</button>
    </div>
    <div class="flex items-start overflow-x-auto" style="min-height: 70vh;">
      <div class="overflow-x-auto shadow-md" style="min-width: 420px;">
        <!-- course list -->
        <panel-wrapper v-if="!loading" v-for="(v, k) in focus" :title="k" :class="choices[k]?.done ? 'bg-blue-100' : 'bg-gray-100'">
          <table v-if="v.tree" class="w-full text-center">
            <tr>
              <th>Code</th>
              <th>Instructor</th>
              <th>Time</th>
              <th>Location</th>
            </tr>
            <template v-for="(ss, lec) in v.tree">
              <tr class="border-white bg-gray-200 border-y-1 all-transition cursor-pointer" :set="s = v.sections[lec]" :class="sections[lec].status" @click="choose(k, lec)"><!-- lecture -->
                <td>{{ lec }}</td>
                <td><div v-for="i in s.instructors">{{ i }}</div></td>
                <td><div v-for="p in s.periods">{{ p.time }}</div></td>
                <td><div v-for="p in s.periods">{{ p.location }}</div></td>
              </tr>
              <tr class="opacity-60 bg-gray-200 border-white border border-x-0 all-transition cursor-pointer" v-for="sec in ss" :set="s = v.sections[sec]" :class="sections[sec].status" @click="choose(k, lec, sec)">
                <td>{{ sec }}</td>
                <td><div v-for="i in s.instructors">{{ i }}</div></td>
                <td><div v-for="p in s.periods">{{ p.time }}</div></td>
                <td><div v-for="p in s.periods">{{ p.location }}</div></td>
              </tr>
            </template>
          </table>
        </panel-wrapper>
      </div>
      <div class="flex-grow" style="min-width: 520px;">
        <schedule :pieces="pieces" />
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
.potential {
  @apply bg-yellow-200 italic;
}
.ok {
  @apply bg-green-200;
}
.text-shadow {
  text-shadow: 1px 1px black;
}
</style>