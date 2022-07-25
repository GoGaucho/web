<script setup>
import { log } from '../firebase.js'
import { useRouter } from 'vue-router'
const router = useRouter()
import links from '../utils/links.js'
import LinkCard from '../components/LinkCard.vue'
log('web/link')
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Links</h1>
    <p class="text-sm text-gray-500">Direct links to portals etc.</p>
    <template v-for="c in links">
      <hr>
      <div class="my-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1 sm:gap-3">
        <LinkCard v-for="l in c" :title="l.title" :description="l.description" :icon="l.icon" :href="l.href" />
      </div>
    </template>
  </div>
</template>