<script setup>
import { LinkIcon, LibraryIcon, BookOpenIcon, CakeIcon } from '@heroicons/vue/outline'
import banner from '../assets/banner.svg'
import Wrapper from '../components/Wrapper.vue'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useRouter } from 'vue-router'
const router = useRouter()
let show = $ref(false), announcement = $ref('')
setTimeout(() => { show = true }, 100)

getDoc(doc(db, 'cache', 'announcement')).then(r => { announcement = r.data().web })

function jump (url) {
  window.location.href = url
}
</script>

<template>
  <div class="relative w-full h-full flex flex-col justify-center pl-10 sm:pl-20 all-transition">
    <img class="absolute z-0 left-0 bottom-0 w-full" style="transition: all 2s ease;" :class="show ? 'opacity-100' : 'opacity-0'" :src="banner">
    <div class="absolute top-0 left-0 w-full">
      <wrapper :show="announcement">
        <div class="bg-blue-200 text-blue-700 p-2 flex items-center justify-center" v-html="announcement" />
      </wrapper>
    </div>
    <h1 class="text-6xl font-bold text-gray-800 overflow-hidden all-transition">GoGaucho</h1>
    <wrapper :show="show" class="w-3/4 flex flex-wrap relative py-8">
      <button @click="router.push('/link')"><link-icon class="w-5 mr-2 text-gray-500" />Links</button>
      <button @click="router.push('/course')"><book-open-icon class="w-6 mr-2 text-gray-500" />Course</button>
      <button @click="router.push('/dining')"><cake-icon class="w-6 mr-2 text-gray-500" />Dining Commons</button>
      <button @click="router.push('/waitz')"><library-icon class="w-6 mr-2 text-gray-500" />Building Busyness</button>
    </wrapper>
  </div>
</template>

<style scoped>
button {
  transition: all 0.3s ease;
  @apply bg-white shadow-md hover:shadow-lg rounded px-3 py-2 m-2 flex items-center;
}
</style>