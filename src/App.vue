<script setup>
import { defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const Bar = defineAsyncComponent(() => import('./components/Bar.vue'))
</script>

<template>
  <bar v-if="!route.query.embed"></bar>
  <router-view></router-view>
</template>
