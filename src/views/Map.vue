<script setup>
import { watch } from 'vue'
import debounce from '../utils/debounce.js'
import locations from '../utils/locations.js'
let q = $ref('UCSB'), query = $ref(''), completion = $ref('')

function search () {
  if (!query) {
    q = 'UCSB'
    completion = ''
    return
  }
  query = query.toUpperCase()
  for (const k in locations) { // prefix search
    if (k.toUpperCase().indexOf(query) === 0) {
      completion = k
      q = locations[k]
      return
    }
  }
  for (const k in locations) { // substring search
    if (k.toUpperCase().includes(query)) {
      completion = k
      q = locations[k]
      return
    }
  }
  completion = ''
}

watch($$(query), v => {
  completion = ''
  debounce(search)()
})
</script>

<template>
  <div class="w-full h-full flex flex-col relative items-center">
    <iframe
      class="border-0 w-full flex-grow"
      loading="lazy"
      :src="`https://www.google.com/maps/embed/v1/place?key=AIzaSyAouu4HsmxgvwGhq0rFOgdw2jbD9bPgN9Y
        &q=` + q">
    </iframe>
    <div class="all-transition bg-white absolute bottom-5 sm:bottom-8 rounded-full px-5 py-2 shadow-md hover:shadow-xl" style="max-width: 70vw;">
      <input type="text" class="absolute text-gray-500 sm:w-96" :value="completion">
      <input type="text" class="relative bg-transparent sm:w-96" placeholder="Search Classroom" v-model="query">
    </div>
  </div>
</template>