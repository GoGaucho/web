<script setup>
import { defineAsyncComponent } from 'vue'
import fire from './assets/fire.svg'
const Bar = defineAsyncComponent(() => import('./components/Bar.vue'))
const embed = window.location.hash.includes('embed')

import state from './model.js'
const calendarRecovery = $computed(() => state.user.uid ? state.calendarImportRecoveries[state.user.uid] : null)

let height = $computed(() => {
  if (embed) return '100vh'
  if (state.screen.sm) return 'calc(100vh - 7rem)'
  return 'calc(100vh - 3.5rem)'
})
</script>

<template>
  <Bar v-if="!embed" />
  <div v-if="calendarRecovery" class="fixed bottom-20 sm:bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg" role="alert">
    <p>{{ calendarRecovery.message }}</p>
    <a :href="calendarRecovery.url" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block underline focus-visible:ring-2 focus-visible:ring-blue-500">Open Google Calendar</a>
    <button type="button" class="ml-3 mt-2 underline focus-visible:ring-2 focus-visible:ring-blue-500" @click="delete state.calendarImportRecoveries[state.user.uid]">I’ve checked my calendar</button>
  </div>
  <div class="relative overflow-y-auto" :style="{ height }">
    <Transition name="fade">
      <div v-if="state.loading" class="absolute z-20 top-0 left-0 right-0 bottom-0 flex flex-col items-center justify-between bg-gray-50">
        <div></div>
        <h3 class="text-gray-700 text-2xl sm:text-3xl font-bold">{{ typeof state.loading === 'string' ? state.loading : 'Just a moment...' }}</h3>
        <img class="w-40 sm:w-60" :src="fire">
      </div>
    </Transition>
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <KeepAlive>
          <Component :is="Component" />
        </KeepAlive>
      </Transition>
    </RouterView>
  </div>
</template>
