<script setup>
import { computed, ref } from 'vue'
import { phoneHref } from '../utils/contacts.js'

const props = defineProps({ service: { type: Object, required: true } })
const websiteUrl = computed(() => props.service.link?.href || props.service.sourceUrl)
const feedback = ref('')
const copying = ref(false)

async function copyNumber() {
  if (copying.value) return
  copying.value = true
  feedback.value = ''
  try {
    await navigator.clipboard.writeText(props.service.phone)
    feedback.value = `Copied ${props.service.phone} for ${props.service.name}.`
  } catch {
    feedback.value = `Could not copy. Select the number ${props.service.phone} to copy it manually.`
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <article class="border-b px-2 py-2 text-sm">
    <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div class="min-w-0">
        <h4 class="font-bold">
          <a v-if="websiteUrl" :href="websiteUrl" target="_blank" rel="noopener noreferrer" class="rounded hover:underline focus-visible:ring-2 focus-visible:ring-blue-500">{{ service.name }}</a>
          <span v-else>{{ service.name }}</span>
          <span v-if="service.availability" class="ml-1 text-xs font-normal text-gray-500">({{ service.availability }})</span>
        </h4>
        <p class="text-xs text-gray-500">{{ service.description }}</p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-x-3">
        <a class="rounded py-1 tabular-nums text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500" :href="phoneHref(service.phone)" :aria-label="`Call ${service.name} at ${service.phone}`">{{ service.phone }}</a>
        <button type="button" class="rounded py-2 text-xs text-gray-500 hover:text-gray-700 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500" :disabled="copying" :aria-label="`Copy phone number for ${service.name}`" @click="copyNumber">Copy</button>
      </div>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" class="text-xs text-gray-500">{{ feedback }}</p>
  </article>
</template>
