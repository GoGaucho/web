<script setup>
import User from './User.vue'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter(), route = useRoute()
</script>

<template>
  <div class="relative z-30 w-full px-2 h-11 sm:px-4 sm:h-14 flex items-center justify-between shadow bg-white">
    <h1 class="text-xl sm:text-2xl font-bold flex items-center cursor-pointer group" @click="router.push('/')">
      <img class="mr-2 w-6 sm:w-8 rounded" src="/icons/logo.png">GoGaucho
    </h1>
    <user></user>
  </div>
</template>