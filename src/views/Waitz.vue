<script setup>
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { MinusSmIcon } from '@heroicons/vue/outline'

let data = $ref(undefined)
getDoc(doc(db, 'cache', 'waitz')).then(r => { data = JSON.parse(r.data().data) })

function getClass (c) {
  if (c.close) return ''
  if (c.busyness > 80) return 'very-busy'
  if (c.busyness > 50) return 'busy'
  return 'not-busy'
}
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Building Busyness</h1>
    <p v-if="!data" class="text-sm text-gray-500">Loading...</p>
    <p v-else class="text-sm text-gray-500">Data from waitz.io</p>
    <div class="my-2 sm:my-4 p-4 sm:p-6 bg-white shadow rounded" v-for="(l, name) in data">
      <div class="flex items-center flex-wrap">
        <div class="flex-grow">
          <h3 class="text-2xl font-bold">{{ name }}</h3>
          <p class="text-gray-500 text-sm">capacity: {{ l.capacity }}</p>
        </div>
        <div :class="[l.close ? 'text-gray-800' : 'text-2xl font-bold', getClass(l)]">{{ l.close || l.busyness + '%' }}</div>
      </div>
      <hr v-if="Object.keys(l.locations).length" class="my-2">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div class="m-3 pb-2 rounded flex justify-between items-center relative overflow-hidden" v-for="(s, name) in l.locations">
          <div>
            <h4>{{ name }}</h4>
            <p class="text-gray-500 text-xs">capacity: {{ s.capacity }}</p>
          </div>
          <div :class="s.close ? 'text-gray-800' : getClass(s)">{{ s.close || s.busyness + '%' }}</div>
          <div class="absolute bottom-0 w-full bg-gray-200">
            <div class="h-1" :class="getClass(s)" :style="{ width: s.busyness + '%' }" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.busy {
  @apply text-yellow-600;
}
.not-busy {
  @apply text-green-600;
}
.very-busy {
  @apply text-red-600;
}
.absolute .busy {
  @apply bg-yellow-600;
}
.absolute .not-busy {
  @apply bg-green-600;
}
.absolute .very-busy {
  @apply bg-red-600;
}
</style>