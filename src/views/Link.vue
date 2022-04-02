<script setup>
import { log } from '../firebase.js'
import { useRouter } from 'vue-router'
const router = useRouter()
import links from '../utils/links.js'
log('web/link')
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Links</h1>
    <p class="text-sm text-gray-500">Direct links to portals etc.</p>
    <template v-for="c in links">
      <hr>
      <div class="my-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-3">
        <a v-for="l in c" class="all-transition cursor-pointer rounded flex items-center bg-gradient-to-r from-white to-gray-100 sm:to-white p-2 w-full sm:border hover:shadow hover:from-blue-50" :href="l.href" target="_blank">
          <picture>
            <source :srcset="l.icon">
            <img class="rounded mr-2 object-cover object-top" style="width: 2.5rem; max-height: 2.5rem;" src="/icons/links/UCSB.jpg">
          </picture>
          <div class="flex-grow">
            <h4 class="font-bold">{{ l.name }}</h4>
            <p class="text-xs text-gray-500">{{ l.description }}</p>
          </div>
        </a>
      </div>
    </template>
  </div>
</template>