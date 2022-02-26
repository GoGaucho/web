<script setup>
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'
import Wrapper from '../components/Wrapper.vue'

const dcs = {
  'de-la-guerra': 'De La Guerra',
  'portola': 'Portola',
  'carrillo': 'Carrillo',
  'ortega': 'Ortega'
}

let data = $ref(undefined), date = $ref(undefined), dc = $ref('')
getDoc(doc(db, 'cache', 'dining')).then(r => {
  data = JSON.parse(r.data().data)
  date = r.data().date
  dc = Object.keys(data)[0]
})
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Dining Commons</h1>
    <p v-if="!data" class="text-sm text-gray-500">Loading...</p>
    <p v-else class="text-sm text-gray-500">{{ date }}</p>
    <div class="my-4" v-if="data">
      <select class="py-1 px-2 border rounded bg-white my-2 block" v-model="dc">
        <option v-for="(v, k) in dcs" :value="k">{{ v }}</option>
      </select>
      <p v-if="!data[dc]">Closed</p>
      <div v-else v-for="(v, mc) in data[dc]" class="rounded shadow-md p-3 my-4" :key="dc">
        <h3 class="text-xl font-bold">{{ mc }}</h3>
        <p class="text-sm text-gray-500">{{ v ? v.hour : 'closed' }}</p>
        <hr class="mt-1 mb-2">
        <div v-if="v" v-for="(names, station) in v.menu" class="px-2">
          <h4 class="font-bold mt-2 mb-1">{{ station }}</h4>
          <wrapper :show="1" class="px-2 ml-1 border-l-2 bg-blue-50 border-blue-600">
            <div v-for="n in names" class="text-gray-700 hover:pl-1 all-transition">{{ n }}</div>
          </wrapper>
        </div>
        
      </div>
    </div>
  </div>
</template>
