<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/vue/24/outline'
import { phoneHref } from '../utils/contacts.js'

const props = defineProps({ service: { type: Object, required: true } })
const websiteUrl = computed(() => props.service.link?.href || props.service.sourceUrl)
const announcement = ref('')
const copying = ref(false)
const copyResult = ref(null)
let dismissTimer
let unmounted = false

onUnmounted(() => {
  unmounted = true
  clearTimeout(dismissTimer)
})

async function copyNumber() {
  if (copying.value) return
  clearTimeout(dismissTimer)
  copyResult.value = null
  announcement.value = ''
  copying.value = true

  let result
  try {
    await navigator.clipboard.writeText(props.service.phone)
    result = 'success'
  } catch {
    result = 'error'
  }

  if (unmounted) return
  copying.value = false
  copyResult.value = result
  announcement.value = result === 'success'
    ? `Copied ${props.service.phone} for ${props.service.name}.`
    : `Could not copy. Select the number ${props.service.phone} to copy it manually.`
  dismissTimer = setTimeout(() => { copyResult.value = null }, 1500)
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
        <div class="relative flex">
          <button type="button" class="inline-flex h-11 w-11 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50" :disabled="copying" :aria-label="`Copy phone number for ${service.name}`" @click="copyNumber">
            <CheckIcon v-if="copyResult === 'success'" aria-hidden="true" class="h-5 w-5 text-green-600" />
            <DocumentDuplicateIcon v-else aria-hidden="true" class="h-5 w-5" />
          </button>
          <span v-if="copyResult" aria-hidden="true" class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-sm">
            {{ copyResult === 'success' ? 'Copied!' : "Couldn't copy" }}
          </span>
        </div>
      </div>
    </div>
    <p role="status" aria-atomic="true" class="sr-only">{{ announcement }}</p>
  </article>
</template>
