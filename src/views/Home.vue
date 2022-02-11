<script setup>
import { LibraryIcon, BookOpenIcon } from '@heroicons/vue/outline'
import banner from '../assets/banner.svg'
import Wrapper from '../components/Wrapper.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
let show = $ref(false)
setTimeout(() => { show = true }, 100)

function jump (url) {
  window.location.href = url
}
</script>

<template>
  <div class="relative w-full flex flex-col justify-center pl-10 sm:pl-20 bg-gray-100" style="height: calc(100vh - 3.5rem);">
    <img class="absolute z-0 left-0 bottom-0 w-full" style="transition: all 2s ease;" :class="show ? 'opacity-100' : 'opacity-0'" :src="banner">
    <h1 class="text-6xl font-bold text-gray-800 overflow-hidden all-transition">GoGaucho</h1>
    <wrapper :show="show" class="w-3/4 flex flex-wrap relative py-8">
      <button class="bg-white shadow-md hover:shadow-lg rounded px-3 py-2 m-2 flex items-center all-transition" @click="jump('https://web.gogaucho.app/')"><book-open-icon class="w-6 mr-2 text-gray-500" />Course</button>
      <button class="bg-white shadow-md hover:shadow-lg rounded px-3 py-2 m-2 flex items-center all-transition" @click="router.push('/waitz')"><library-icon class="w-6 mr-2 text-gray-500" />Building Busyness</button>
    </wrapper>
  </div>
</template>