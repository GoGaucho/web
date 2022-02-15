<script setup>
import { watch } from 'vue'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'
const props = defineProps(['modelValue', 'quarter'])
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
  course = await getDoc(doc(db, 'course', props.quarter + v)).then(r => r.data())
  setTimeout(() => { course.show = 1 })
  console.log(course)
})
</script>

<template>
  <transition name="fade">
    <div v-if="isMobile && props.modelValue" @click="emits('update:modelValue', false)" class="fixed w-full h-screen bg-black opacity-30 z-50 top-0" />
  </transition>
  <div class="course bg-white p-4 sm:p-6 flex-grow all-transition
    fixed top-0 h-screen w-5/6 z-50 overflow-auto
    md:sticky md:top-20 md:w-auto md:h-auto md:shadow-md md:z-10
  " :style="{ left: isMobile && !props.modelValue ? '-100%' : '0px' }">
    <h2 class="text-xl sm:text-2xl font-bold">{{ title }}</h2>
    <wrapper :show="course.show" :key="props.modelValue">
      <p class="text-sm text-gray-600">{{ course.college }} &nbsp; {{ course.department }} &nbsp; {{ levels[course.level] }}</p>
      <p class="my-2">{{ course.description }}</p>
      <p><b>Units:</b> {{ course.units }}</p>
      <p><b>Grading:</b> {{ gradings[course.grading] }}</p>
      <p><b>Contact Hours:</b> {{ course.hours }}</p>
      <p v-if="course.GE" class="flex flex-wrap items-center">
        <b>GE: </b>
        <label v-for="g in course.GE" class="border text-sm border-blue-400 text-blue-400 bg-blue-100 rounded px-1 m-1">{{ g }}</label>
        <span v-if="!course.GE.length"> N/A</span>
      </p>
      <div v-if="course.tree" v-for="(ss, lec) in course.tree">
        {{lec}}
        <div v-for="s in ss">{{ s }}</div>
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