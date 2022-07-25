<script setup>
import { XIcon } from '@heroicons/vue/outline'
const props = defineProps(['modelValue', 'closable'])
const emits = defineEmits(['update:modelValue', 'close'])
</script>

<template>
  <label class="all-transition border text-sm rounded px-2 m-1 flex items-center cursor-pointer select-none" :class="props.modelValue ? 'shadow text-white border-blue-500 bg-blue-500' : 'border-blue-500 text-blue-500 bg-blue-100'" @click="emits('update:modelValue', !props.modelValue)">
    <slot></slot>
    <XIcon v-if="props.closable" class="w-4" @click.stop="emits('close')" />
  </label>
</template>