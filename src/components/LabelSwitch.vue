<script setup>
import { XIcon } from '@heroicons/vue/outline'
const props = defineProps(['modelValue', 'closable'])
const emits = defineEmits(['update:modelValue', 'close'])
</script>

<template>
  <label class="all-transition border text-sm rounded px-1 m-1 flex items-center cursor-pointer select-none" :class="props.modelValue ? 'border-orange-400 text-orange-400 bg-orange-100 font-bold' : 'border-blue-400 text-blue-400 bg-blue-100'" @click="emits('update:modelValue', !props.modelValue)">
    <slot></slot>
    <x-icon v-if="props.closable" class="w-4" @click.stop="emits('close')" />
  </label>
</template>