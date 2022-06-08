<script setup>
import { LinkIcon, MapIcon, LibraryIcon, BookOpenIcon, ColorSwatchIcon, AcademicCapIcon } from '@heroicons/vue/outline'
import banner from '../assets/banner.svg'
import diningImg from '../assets/portola.jpg'
import Wrapper from '../components/Wrapper.vue'
import { get } from '../firebase.js'
import state from '../model.js'
import { useRouter } from 'vue-router'
const router = useRouter()

let home = $ref({})
async function init () {
  home = await get('cache/home')
  state.quarter = home.quarter.current
}
init()
</script>

<template>
  <div class="relative w-full h-full flex flex-col py-10 px-6 sm:px-20 all-transition">
    <img class="fixed z-0 left-0 bottom-14 sm:bottom-0 w-full" :src="banner">
    <div class="absolute top-0 left-0 w-full">
      <wrapper :show="home.top">
        <div class="bg-blue-200 text-blue-700 p-2 flex items-center justify-center" v-html="home.top" />
      </wrapper>
    </div>
    <h1 class="font-bold text-2xl mt-4">Hi, {{ state.user.name || 'Gaucho' }}</h1>
    <p class="text-sm text-gray-500">{{ home.subtitle || 'Welcome to GoGaucho' }}</p>
    <div class="bg-white my-4 sm:my-10">
      <h2 class="font-bold text-xl">Summary of your day</h2>
      <p>Under development</p>
      <p>Under development</p>
    </div>
    <div class="flex relative flex-col sm:flex-row items-start"><!-- dining & links -->
      <div class="w-full sm:w-80 rounded-lg overflow-hidden relative cursor-pointer group" style="max-width: 400px;" @click="router.push('/dining')">
        <div class="all-transition bg-black opacity-60 absolute z-10 left-0 top-0 right-0 bottom-0 group-hover:opacity-20" />
        <img class="w-full relative z-0" :src="diningImg">
        <div class="absolute left-4 top-4 text-white z-20">
          <h3 class="font-bold text-lg">Dining Commons</h3>
          <p class="border border-x-0 border-b-0 text-sm pr-2">Click to see hours and menus</p>
        </div>
      </div>
      <div class="w-full my-4 sm:my-0 sm:w-auto flex-grow sm:ml-6 font-bold md:text-lg">
        <div class="flex items-start w-full flex-wrap">
          <a class="link opacity-90" href="https://my.sa.ucsb.edu/gold/" style="background: #0b254e; color: #ffce34;">GOLD</a>
          <a class="link" style="padding: 0;" href="https://sso.ucsb.edu:8443/cas/login?service=https%3A%2F%2Fgauchospace.ucsb.edu%2Fcourses%2Flogin%2Findex.php%3FauthCAS%3DCAS"><img class="w-8 md:w-9" src="/icons/links/GauchoSpace.jpg"></a>
          <a class="link" href="https://www.gradescope.com/auth/saml/ucsb"><img class="w-6 md:w-7" src="/icons/links/GradeScope.png"></a>
          <a class="link text-gray-500 flex items-center" @click="router.push('/link')"><link-icon class="w-4 mr-2" />More Links</a>
        </div>
        <div class="hidden lg:flex flex-wrap text-gray-500 my-2">
          <button @click="router.push('/map')"><map-icon class="w-5 mr-2" />Map</button>
          <button @click="router.push('/course')"><book-open-icon class="w-6 mr-2" />Course</button>
          <button @click="router.push('/class')"><academic-cap-icon class="w-6 mr-2" />My Classes</button>
        </div>
        <button class="text-lg text-gray-800" @click="router.push('/waitz')"><library-icon class="w-6 mr-2" />Building Capacity</button>
      </div>
    </div>
    <div class="h-20" />
  </div>
</template>

<style scoped>
.link {
  transition: all 0.3s ease;
  @apply rounded shadow hover:shadow-md bg-white py-1 px-2 m-1 cursor-pointer overflow-hidden;
}
button {
  transition: all 0.3s ease;
  @apply bg-white shadow-md hover:shadow-lg rounded px-2 py-1 m-1 flex items-center font-bold;
}
</style>