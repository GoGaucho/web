<script setup>
import { defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
const embed = useRoute().query.embed
const Bar = defineAsyncComponent(() => import('./components/Bar.vue'))
</script>

<template>
  <bar v-if="!embed"></bar>
  <div class="relative h-1 bg-gray-100" :style="{ minHeight: embed ? '100vh' : 'calc(100vh - 3.5rem)' }">
    <router-view></router-view>
  </div>
</template>
