<script setup>
import User from './User.vue'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter(), route = useRoute()
</script>

<template>
  <div class="relative z-30 w-full px-4 h-14 flex items-center justify-between shadow bg-white">
    <h1 class="text-2xl font-bold flex items-center cursor-pointer group" @click="router.push('/')">
      <img class="mr-2 w-8 rounded" src="/icons/logo.png">GoGaucho
    </h1>
    <user></user>
  </div>
</template>