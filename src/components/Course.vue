<script setup>
import { CheckIcon } from '@heroicons/vue/outline'
import { watch } from 'vue'
import { getDoc, doc } from 'firebase/firestore'
import { db, state } from '../firebase.js'
const props = defineProps(['modelValue'])
const emits = defineEmits(['update:modelValue'])
import Wrapper from './Wrapper.vue'

// control UI
let isMobile = $ref(false)
window.onresize = () => { isMobile = window.innerWidth < 768 }
window.onresize()

const levels = { U: 'Undergraduate', G: 'Graduate', L: 'Lower Division', S: 'Upper Division' }
const gradings = { null: 'optional', L: 'Letter', P: 'P/NP' }

let course = $ref({})
let title = $computed(() => props.modelValue ? props.modelValue + ': ' + (course.title || '') : 'Please select a course')

watch(() => props.modelValue, async v => {
  if (!v) return
  course = {}
  course = await getDoc(doc(db, 'course', state.course.quarter + v)).then(r => r.data())
  setTimeout(() => { course.show = 1 })
})
</script>

<template>
  <transition name="fade">
    <div v-if="isMobile && props.modelValue" @click="emits('update:modelValue', false)" class="fixed w-full h-screen bg-black opacity-30 z-50 top-0" />
  </transition>
  <div class="course bg-white p-4 sm:p-6 flex-grow all-transition
    fixed top-0 h-screen w-5/6 sm:w-11/12 z-50 overflow-auto
    md:sticky md:top-20 md:w-auto md:h-auto md:shadow-md md:z-10
  " :style="{ left: isMobile && !props.modelValue ? '-100%' : '0px' }">
    <h2 class="text-xl sm:text-2xl font-bold mr-6">{{ title }}</h2>
    <wrapper :show="course.show" :key="props.modelValue">
      <p class="text-sm text-gray-600">{{ course.college }} &nbsp; {{ course.department }} &nbsp; {{ levels[course.level] }}</p>
      <button class="text-white text-sm shadow rounded-full bg-blue-500 px-4 py-1 my-2 flex items-center" :set="focus = state.course.focus" @click="focus[props.modelValue] = !focus[props.modelValue]">
        <check-icon class="all-transition overflow-x-hidden" :class="focus[props.modelValue] ? 'w-5 mr-1' : 'w-0'" />
        Focus
      </button>
      <p class="my-2">{{ course.description }}</p>
      <p v-if="course.session"><b>Session:</b> {{ course.session }}</p>
      <p><b>Units:</b> {{ course.units }}</p>
      <p><b>Grading:</b> {{ gradings[course.grading] }}</p>
      <p><b>Contact Hours:</b> {{ course.hours }}</p>
      <p v-if="course.GE" class="flex flex-wrap items-center">
        <b>GE: </b>
        <label v-for="g in course.GE" class="border text-sm border-blue-400 text-blue-400 bg-blue-100 rounded px-1 m-1">{{ g }}</label>
        <span v-if="!course.GE.length" class="px-1">N/A</span>
      </p>
      <hr class="my-3">
      <div class="w-full overflow-x-auto">
        <table v-if="course.tree" class="w-full text-center" style="min-width: 480px;">
          <tr>
            <th>Code</th>
            <th>Instructor</th>
            <th>Time</th>
            <th>Location</th>
          </tr>
          <template v-for="(ss, lec) in course.tree">
            <tr class="bg-blue-100 border-white border-y-1" :set="s = course.sections[lec]"><!-- lecture -->
              <td>{{ lec }}</td>
              <td><div v-for="i in s.instructors">{{ i }}</div></td>
              <td><div v-for="p in s.periods">{{ p.time }}</div></td>
              <td><div v-for="p in s.periods">{{ p.location }}</div></td>
            </tr>
            <tr class="opacity-60 bg-blue-100 border-white border border-x-0 all-transition" v-for="code in ss" :set="s = course.sections[code]">
              <td>{{ code }}</td>
              <td><div v-for="i in s.instructors">{{ i }}</div></td>
              <td><div v-for="p in s.periods">{{ p.time }}</div></td>
              <td><div v-for="p in s.periods">{{ p.location }}</div></td>
            </tr>
          </template>
        </table>
      </div>
    </wrapper>
  </div>
</template>

<style scoped>
.course {
  max-height: 100vh;
}
@media (min-width: 768px) {
  .course {
    max-height: calc(100vh - 7rem);
  }
}
</style>