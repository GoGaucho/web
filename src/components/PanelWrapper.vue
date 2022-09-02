<script setup>
import { watch } from 'vue'
import Wrapper from '../components/Wrapper.vue'
import { ChevronDownIcon } from '@heroicons/vue/24/solid'

const props = defineProps(['title', 'class', 'modelValue'])
const emits = defineEmits(['update:modelValue'])
let show = $ref(false)
watch(() => props.modelValue, v => {
  show = v
}, { immediate: true })

watch($$(show), v => {
  if (props.modelValue != v) emits('update:modelValue', show)
})
</script>

<template>
  <div class="w-full flex justify-between items-center px-3 py-1 shadow cursor-pointer all-transition" :class="props.class" @click="show = !show">
    <h3 class="font-bold">{{ props.title }}</h3>
    <ChevronDownIcon class="all-transition w-6 text-gray-400" :class="{ 'rotate-90': !show }" />
  </div>
  <Wrapper :show="show">
    <slot></slot>
  </Wrapper>
</template>
