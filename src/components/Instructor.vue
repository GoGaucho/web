<script setup>
import { watch } from 'vue'
import { XIcon } from '@heroicons/vue/outline'
const props = defineProps(['name'])
const emits = defineEmits(['close'])
import { get } from '../firebase.js'

const GRADE = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
const GPA = [4, 4, 3.7, 3.3, 3.0, 2.7, 2.3, 2.0, 1.7, 1.3, 1.0, 0.7, 0]
const COLOR = ['bg-red-600', 'bg-red-400', 'bg-red-200', 'bg-blue-600', 'bg-blue-400', 'bg-blue-200', 'bg-yellow-600', 'bg-yellow-400', 'bg-yellow-200', 'bg-green-600', 'bg-green-400', 'bg-green-200', 'bg-gray-400']

let data = $ref(null), hover = $ref(false)
let grade = $computed(() => {
  if (!data.grades) return false
  let sum = 0, cot = 0
  for (let i = 0; i <= 12; i++) {
    cot += data.grades[i]
    sum += data.grades[i] * GPA[i]
  }
  return { avg: (sum / cot).toFixed(2), cot }
})
watch(() => props.name, async v => {
  if (!v) return
  data = null
  data = await get('instructor/' + v)
  if (data) data.key = v
})
</script>

<template>
  <transition name="fade">
    <div class="fixed z-50 bottom-4 right-4 w-72 rounded bg-white p-3 ring" v-if="props.name && data">
      <x-icon class="w-5 text-gray-500 absolute z-50 right-3 top-3 cursor-pointer" @click="emits('close')" />
      <h3 class="font-bold">{{ data.name || data.key }}</h3>
      <p v-if="data.name" class="text-xs text-gray-400">{{ data.key }}</p>
      <hr class="my-1">
      <p v-if="data.rmp">RMP Score: <span class="font-bold">{{ data.rmp }}</span></p>
      <template v-if="grade">
        <p>Avg. GPA: <span class="font-bold">{{ grade.avg }}</span> (of {{ grade.cot }})</p>
        <div class="w-full flex items-center">
          <div v-for="(c, i) in COLOR" class="h-4" :class="c" :style="{ width: 100*data.grades[i]/grade.cot + '%' }" />
        </div>
        <p class="text-xs text-gray-200">Based on 2015-2021 public grades</p>
      </template>
    </div>
  </transition>
</template>