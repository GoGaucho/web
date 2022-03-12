<script setup>
import { defineAsyncComponent } from 'vue'
const Bar = defineAsyncComponent(() => import('./components/Bar.vue'))
const embed = window.location.hash.includes('embed')

import Loading from './components/Loading.vue'
import { state } from './firebase.js'
</script>

<template>
  <bar v-if="!embed"></bar>
  <div class="relative overflow-y-auto" :style="{ height: embed ? '100vh' : 'calc(100vh - 3.5rem)' }">
    <transition name="fade">
      <loading v-if="state.loading">
        <h3 class="text-gray-700 text-2xl sm:text-3xl font-bold">{{ typeof state.loading === 'string' ? state.loading : 'Just a moment...' }}</h3>
      </loading>
    </transition>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>
