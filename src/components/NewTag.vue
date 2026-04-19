<script setup>
const props = defineProps({
  until: { type: String, required: true },
  label: { type: String, default: 'NEW' }
})
const show = Date.now() < new Date(props.until).getTime()
</script>

<template>
  <span v-if="show" class="tag">{{ label }}</span>
</template>

<style scoped>
.tag {
  @apply ml-2 text-white bg-blue-500 rounded-full px-1.5 leading-none inline-flex items-center font-bold;
  font-size: 0.625rem;
  height: 0.875rem;
  margin-top: -0.125rem;
}
</style>
