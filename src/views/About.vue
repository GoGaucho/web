<script setup>
import fire from '../assets/fire.svg'
import { log } from '../firebase.js'
import { EllipsisVerticalIcon } from '@heroicons/vue/24/outline'
import PanelWrapper from '../components/PanelWrapper.vue'
import LinkCard from '../components/LinkCard.vue'
import { useRouter } from 'vue-router'
const router = useRouter()

log('web/about')
</script>

<template>
  <div class="pb-60 min-h-full relative flex flex-col items-center text-center">
    <div class="w-full relative overflow-hidden" style="max-height: 24rem;">
      <img class="w-full h-full" src="https://my.sa.ucsb.edu/catalog/Current/Images/photo_catalognoborder.jpg">
      <div class="absolute top-0 h-full w-full bg-white opacity-60" />
      <div class="absolute top-0 h-full w-full flex flex-col justify-center" style="color: #0b254e;">
        <h1 class="text-3xl sm:text-5xl font-bold mt-2">We are here for <br> your success.</h1>
      </div>
    </div>
    <div class="p-4 sm:p-10 w-full" style="max-width: 800px;">
      <h2 class="text-xl mt-20 mb-4 font-bold">What's GoGaucho?</h2>
      <p>GoGaucho is the best campus app for UCSB students. <br class="hidden sm:block"> GoGaucho Web is the next generation WebApp, which is designed to serve UCSB students anywhere, anytime, and on any platforms. <br class="hidden sm:block">GoGaucho is run by students and is not an official UCSB application.</p>
      <h2 class="text-xl mt-20 mb-4 font-bold">How to install the web app</h2>
      <p>Follow the instructions for a better web app experiences.</p>
      <PanelWrapper title="Desktop (Chrome)" class="bg-white mt-4">
        <img class="w-full" src="/guide/desktop.png">
        <p class="text-left p-2">Open the Google Chrome browser and visit <b>ucsb.app</b>, click the install icon on the address bar and install the WebApp to your computer. After installing, you can open GoGaucho as an App from your desktop or Home menu.</p>
      </PanelWrapper>
      <PanelWrapper title="Android (Chrome)" class="bg-white">
        <img class="w-full" src="/guide/android.png">
        <p class="text-left p-2">Open the Google Chrome browser (or any supporting browser) and visit <b>ucsb.app</b>, click the top-right <EllipsisVerticalIcon class="w-5 inline border border-gray-300" /> icon to open the menu, and then click <b>Install app</b>. After installing, you can open GoGaucho as an App from your home screen.</p>
      </PanelWrapper>
      <h2 class="text-xl mt-20 mb-4 font-bold">How does it work?</h2>
      <p>GoGaucho is developed and maintained by UCSB students independently. GoGaucho obtains data from various sources. We are not permitted to store your personal data (schedule etc.) in any form. <b>Your personal data is directly passed from the official UCSB server to your devices under proper authorization. </b></p>
      <h2 class="text-xl mt-20 mb-4 font-bold">How to contact us?</h2>
      <p>You are welcome to contact us for bug reports, feature suggestions, and joining applications. We appreciate your precious ideas and valuable experiences.</p>
      <div class="my-4 flex justify-center flex-wrap">
        <LinkCard class="m-1 w-full sm:w-64" title="Email" description="gogauchoapp@ucsb.edu" href="mailto:gogauchoapp@ucsb.edu" icon="/icons/logo.png" />
        <LinkCard class="m-1 w-full sm:w-64" title="Discord" description="Join GoGaucho Server" href="https://discord.gg/64jqp8Z3xH" icon="/icons/links/discord.png" />
        <LinkCard class="m-1 w-full sm:w-64" title="Twitter" description="Follow @GoGauchoApp" href="https://twitter.com/GoGauchoApp" icon="/icons/links/Twitter.png" />
        <LinkCard class="m-1 w-full sm:w-64" title="Instagram" description="Follow @GoGauchoApp" href="https://www.instagram.com/GoGauchoApp/" icon="/icons/links/Instagram.png" />
      </div>
      <div class="my-8 flex items-center justify-center">
        <button class="all-transition rounded-full hover:bg-gray-200 text-blue-500 font-bold px-4 py-1 m-4" @click="router.push('/privacy')">Privacy Policy</button>
        <button class="all-transition rounded-full hover:bg-gray-200 text-blue-500 font-bold px-4 py-1 m-4" @click="router.push('/team')">GoGaucho Team</button>
      </div>
    </div>
    <img class="w-40 sm:w-60 absolute bottom-0" :src="fire">
  </div>
</template>
