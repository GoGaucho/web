<script setup>
import { LinkIcon, MapIcon, LibraryIcon, BookOpenIcon, ColorSwatchIcon, AcademicCapIcon } from '@heroicons/vue/outline'
import banner from '../assets/banner.svg'
import diningImg from '../assets/portola.jpg'
import Wrapper from '../components/Wrapper.vue'
import LinkCard from '../components/LinkCard.vue'
import DaySummary from '../components/DaySummary.vue'
import links from '../utils/links.js'
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
    <day-summary></day-summary>
    <div class="flex relative flex-col sm:flex-row items-start">
      <div class="hidden lg:block w-80 mr-4 rounded-lg overflow-hidden relative cursor-pointer group" @click="router.push('/dining')">
        <div class="all-transition bg-black opacity-60 absolute z-10 left-0 top-0 right-0 bottom-0 group-hover:opacity-20" />
        <img class="w-full relative z-0" :src="diningImg">
        <div class="absolute left-4 top-4 text-white z-20">
          <h3 class="font-bold text-lg">Dining Commons</h3>
          <p class="border border-x-0 border-b-0 text-sm pr-2">Click to see hours and menus</p>
        </div>
      </div>
      <div class="sm:pr-4 w-full sm:w-64">
        <div class="button" @click="router.push('/map')"><map-icon class="w-6 mr-2" />Map</div>
        <div class="button" @click="router.push('/dining')"><color-swatch-icon class="w-6 mr-2" />Dining</div>
        <div class="button" @click="router.push('/course')"><book-open-icon class="w-6 mr-2" />Course</div>
        <div class="button" @click="router.push('/waitz')"><library-icon class="w-6 mr-2" />Building Capacity</div>
        <hr>
      </div>
      <div class="w-full sm:w-56 my-4 sm:my-0">
        <link-card class="w-full m-1" v-for="l in links[0]" :title="l.title" :icon="l.icon" :href="l.href" small="1" />
        <p class="text-xs text-gray-500 px-2 cursor-pointer" @click="router.push('/link')">More links ></p>
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
.button {
  transition: all 0.3s ease;
  @apply cursor-pointer p-2 flex items-center font-bold border border-x-0 border-b-0 hover:bg-gray-200;
}
</style>