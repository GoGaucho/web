<script setup>
import fire from '../assets/fire.svg'
import { url } from '../firebase.js'
import PanelWrapper from '../components/PanelWrapper.vue'

let guide = $ref({})

async function init () {
  guide = {
    desktop: await url('web/guide_desktop.png'),
    android: await url('web/guide_android.png'),
    ios: await url('web/guide_ios.png')
  }
}
init()
</script>

<template>
  <div class="p-4 sm:p-10 pb-60 sm:pb-80 min-h-full relative">
    <h1 class="text-2xl">About GoGaucho Web</h1>
    <p class="text-gray-500 mb-4">We are here for your success</p>
    <h2 class="text-xl">How to install?</h2>
    <panel-wrapper title="Desktop (Chrome)" class="bg-white mt-4">
      <img :src="guide.desktop">
    </panel-wrapper>
    <panel-wrapper title="Android (Chrome)" class="bg-white">
      <img :src="guide.android">
    </panel-wrapper>
    <panel-wrapper title="iOS (Safari)" class="bg-white">
      <img :src="guide.ios">
    </panel-wrapper>
    <img class="w-40 sm:w-60 left-1/2 absolute bottom-0 -translate-x-1/2" :src="fire">
  </div>
</template>
