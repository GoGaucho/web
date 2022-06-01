<script setup>
import { defineAsyncComponent } from 'vue'
import fire from './assets/fire.svg'
const Bar = defineAsyncComponent(() => import('./components/Bar.vue'))
const embed = window.location.hash.includes('embed')

import state from './model.js'

let height = $computed(() => {
  if (embed) return '100vh'
  if (state.screen.sm) return 'calc(100vh - 3.5rem)'
  return 'calc(100vh - 3.5rem)'
})
</script>

<template>
  <bar v-if="!embed"></bar>
  <div class="relative overflow-y-auto" :style="{ height }">
    <transition name="fade">
      <div v-if="state.loading" class="absolute z-20 top-0 left-0 right-0 bottom-0 flex flex-col items-center justify-between bg-gray-50">
        <div></div>
        <h3 class="text-gray-700 text-2xl sm:text-3xl font-bold">{{ typeof state.loading === 'string' ? state.loading : 'Just a moment...' }}</h3>
        <img class="w-40 sm:w-60" :src="fire">
      </div>
    </transition>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>
