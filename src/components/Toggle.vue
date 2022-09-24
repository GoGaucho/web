<script setup>
import { watch } from 'vue'
const props = defineProps(['modelValue'])
const emits = defineEmits(['update:modelValue'])
let input = $ref(props.modelValue)

watch($$(input), v => {
  emits('update:modelValue', v)
})

watch(() => props.modelValue, v => {
  if (input !== v) input = v
})
</script>

<template>
  <label class="inline-flex relative items-center cursor-pointer">
    <input type="checkbox" v-model="input" class="sr-only peer">
    <div class="w-11 h-6 bg-gray-500 rounded-full peer peer-checked:after:translate-x-full after:border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
    <span class="ml-2 font-medium text-gray-900">
      <slot></slot>
    </span>
  </label>
</template>