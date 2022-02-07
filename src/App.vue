<script setup>
import Bar from './components/Bar.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <bar v-if="!route.query.embed"></bar>
  <router-view></router-view>
</template>
