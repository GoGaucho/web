<script setup>
import { watch } from 'vue'
import { CheckIcon } from '@heroicons/vue/24/outline'
import { get } from '../firebase.js'
import state from '../model.js'
import Wrapper from './Wrapper.vue'
import Instructor from './Instructor.vue'
import LabelSwitch from './LabelSwitch.vue'

const props = defineProps({
  modelValue: String,
  quarter: {
    type: String,
    default: () => state.course.quarter,
  }
})
const emits = defineEmits(['update:modelValue'])

// control UI
const levels = { U: 'Undergraduate', G: 'Graduate', L: 'Lower Division', S: 'Upper Division' }
const gradings = { null: 'optional', L: 'Letter', P: 'P/NP' }

let course = $ref({}), isSummer = $ref(false)
let title = $computed(() => props.modelValue ? props.modelValue + ': ' + (course.title || '') : 'Please select a course')

let instructorName = $ref('')
function leaveInstructor () {
  if (!state.screen.md) instructorName = ''
}

watch(
  () => [props.modelValue, props.quarter],
  async ([v, q]) => {
    if (!v) {
      course = {}
      isSummer = false
      return
    }

    course = {}
    isSummer = false
    const quarter = q || state.course.quarter

    course = await get('course/' + quarter + v)

    for (const s in course.sections) {
      if (course.sections[s].session) {
        isSummer = true
        break
      }
    }
    setTimeout(() => { course.show = 1 })
  },
  { immediate: true }
)


function toggleFocus () {
  const k = props.modelValue
  if (state.course.focus[k]) delete state.course.focus[k]
  else state.course.focus[k] = 1
}
</script>

<template>
  <Transition name="fade">
    <div v-if="state.screen.md && props.modelValue" @click="emits('update:modelValue', false)" class="fixed w-full h-screen bg-black opacity-30 z-50 top-0" />
  </Transition>
  <div class="course bg-white p-4 sm:p-6 flex-grow all-transition
    fixed top-0 h-screen w-5/6 sm:w-11/12 z-50 overflow-auto
    md:sticky md:top-20 md:w-auto md:h-auto md:shadow-md md:z-10
  " :style="{ left: state.screen.md && !props.modelValue ? '-100%' : '0px' }">
    <h2 class="text-xl sm:text-2xl font-bold mr-6">{{ title }}</h2>
    <Wrapper :show="course.show" :key="props.modelValue">
      <p class="text-sm text-gray-600">{{ course.college }} &nbsp; {{ course.department }} &nbsp; {{ levels[course.level] }}</p>
      <button class="text-white text-sm shadow rounded-full bg-blue-500 px-4 py-1 my-2 flex items-center" @click="toggleFocus">
        <CheckIcon class="all-transition overflow-x-hidden" :class="state.course.focus[props.modelValue] ? 'w-5 mr-1' : 'w-0'" />
        Focus
      </button>
      <p class="my-2">{{ course.description }}</p>
      <p><b>Units:</b> {{ course.units }}</p>
      <p><b>Grading:</b> {{ gradings[course.grading] }}</p>
      <p><b>Contact Hours:</b> {{ course.hours }}</p>
      <p v-if="course.GE" class="flex flex-wrap items-center">
        <b>GE: </b>
        <LabelSwitch v-for="g in course.GE">{{ g }}</LabelSwitch>
        <span v-if="!course.GE.length" class="px-1">N/A</span>
      </p>
      <hr class="my-3">
      <div class="w-full overflow-x-auto">
        <table v-if="course.tree" class="w-full text-center" :style="{ minWidth: isSummer ? '560px' : '480px' }">
          <tr>
            <th v-if="isSummer">Session</th>
            <th>Code</th>
            <th>Instructor</th>
            <th>Time</th>
            <th>Location</th>
          </tr>
          <template v-for="(ss, lec) in course.tree">
            <tr class="bg-blue-100 border-white border-y-1" :set="s = course.sections[lec]"><!-- lecture -->
              <td class="text-sm" v-if="isSummer">{{ s.session }}</td>
              <td :class="s.closed && 'line-through'">{{ lec }}</td>
              <td><div v-for="i in s.instructors" @click="instructorName = i" @mouseenter="instructorName = i" @mouseleave="leaveInstructor">{{ i }}</div></td>
              <td><div v-for="p in s.periods">{{ p.time }}</div></td>
              <td><div v-for="p in s.periods">{{ p.location }}</div></td>
            </tr>
            <tr class="opacity-60 bg-blue-100 border-white border border-x-0 all-transition" v-for="code in ss" :set="s = course.sections[code]">
              <td class="text-sm" v-if="isSummer">{{ s.session }}</td>
              <td :class="s.closed && 'line-through'">{{ code }}</td>
              <td><div v-for="i in s.instructors" @mouseenter="instructorName = i" @mouseleave="instructorName = ''">{{ i }}</div></td>
              <td><div v-for="p in s.periods">{{ p.time }}</div></td>
              <td><div v-for="p in s.periods">{{ p.location }}</div></td>
            </tr>
          </template>
        </table>
      </div>
    </Wrapper>
  </div>
  <Instructor :name="instructorName" @close="instructorName = ''" />
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