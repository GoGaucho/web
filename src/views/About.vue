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
  <div class="pb-60 min-h-full relative flex flex-col items-center text-center">
    <div class="w-full relative overflow-hidden" style="max-height: 24rem;">
      <img class="w-full h-full" src="https://my.sa.ucsb.edu/catalog/Current/Images/photo_catalognoborder.jpg">
      <div class="absolute top-0 h-full w-full bg-white opacity-60" />
      <div class="absolute top-0 h-full w-full flex flex-col justify-center">
        <h1 class="text-3xl sm:text-5xl font-bold mt-2" style="color: #0b254e;">We are here for <br> your success.</h1>
      </div>
    </div>
    <div class="p-4 sm:p-10 w-full" style="max-width: 800px;">
      <h2 class="text-xl mt-20 mb-4 font-bold">What's GoGaucho?</h2>
      <p>GoGaucho is the best campus app for UCSB students. <br class="hidden sm:block"> GoGaucho Web is the next generation WebApp, which is designed to serve UCSB students anywhere, anytime, and on any platforms.</p>
      <h2 class="text-xl mt-20 mb-4 font-bold">How to install?</h2>
      <p>Install for better experiences.</p>
      <panel-wrapper title="Desktop (Chrome)" class="bg-white mt-4">
        <img class="w-full" :src="guide.desktop">
      </panel-wrapper>
      <panel-wrapper title="Android (Chrome)" class="bg-white">
        <img class="w-full" :src="guide.android">
      </panel-wrapper>
      <panel-wrapper title="iOS (Safari)" class="bg-white">
        <img class="w-full" :src="guide.ios">
      </panel-wrapper>
      <h2 class="text-xl mt-20 mb-4 font-bold">How to navigate?</h2>
      <p>The top-left icon can bring you back to homepage. <br class="hidden sm:block"> You can login to your UCSB Google account on the top-right corner.</p>
      <h2 class="text-xl mt-20 mb-4 font-bold">How does it work?</h2>
      <p>GoGaucho is developed and maintained by UCSB students independently. GoGaucho obtains data from various sources. We are not permitted to store your personal data (schedule etc.) in any form. <b>Your personal data is directly passed from official UCSB server to your devices under proper authorization. </b></p>
      <h2 class="text-xl mt-20 mb-4 font-bold">How to contact us?</h2>
      <p>You are welcomed to contact us for bug reports, feature suggestions, and joining applications. We appreciate your precious ideas and valuable experiences.</p>
      <div class="flex justify-center flex-wrap text-left">
        <a class="w-full sm:w-72 m-2 all-transition cursor-pointer rounded flex items-center bg-gradient-to-r from-white to-gray-100 sm:to-white p-2 w-full sm:border hover:shadow hover:from-blue-50" style="min-width: 18rem;" href="https://discord.gg/64jqp8Z3xH" target="_blank">
          <img class="rounded mr-2 object-cover object-top" style="width: 2.5rem; max-height: 2.5rem;" src="/icons/links/Discord.png">
          <div class="flex-grow">
            <h4 class="font-bold">Discord</h4>
            <p class="text-xs text-gray-500">Join GoGaucho Server</p>
          </div>
        </a>
        <a class="w-full sm:w-72 m-2 all-transition rounded flex items-center bg-gradient-to-r from-white to-gray-100 sm:to-white p-2 w-full sm:border hover:shadow hover:from-blue-50" href="mailto:gogauchoapp@ucsb.edu" target="_blank" style="min-width: 18rem;">
          <img class="rounded mr-2 object-cover object-top" style="width: 2.5rem; max-height: 2.5rem;" src="/icons/logo.png">
          <div class="flex-grow">
            <h4 class="font-bold">Email</h4>
            <p @click.prevent="" class="text-xs text-gray-500 cursor-text select-all">gogauchoapp@ucsb.edu</p>
          </div>
        </a>
      </div>
    </div>
    <img class="w-40 sm:w-60 absolute bottom-0" :src="fire">
  </div>
</template>
