<script setup>
import state from '../model.js'
let data = $computed(() => state.course.instructors && state.course.instructor && state.course.instructors[state.course.instructor])
</script>

<template>
  <transition name="fade">
    <div class="fixed z-50 bottom-4 right-4 w-72 rounded bg-white p-3 ring" v-if="data">
      <h3 class="font-bold">{{ state.course.instructor }}</h3>
      <p class="text-xs text-gray-500">Based on 2015-2021 public grades</p>
      <p>Avg. GPA: <span class="font-bold">{{ data.toFixed(2) }}</span></p>
    </div>
  </transition>
</template>