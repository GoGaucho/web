<script setup>
import { watch } from 'vue'
import { getDoc, doc } from 'firebase/firestore'
import { db, log } from '../firebase.js'
import { cache } from '../model.js'
import { CreditCardIcon, HeartIcon } from '@heroicons/vue/outline'
import Wrapper from '../components/Wrapper.vue'
log('web/dining')

const dcs = {
  'de-la-guerra': 'De La Guerra',
  'portola': 'Portola',
  'carrillo': 'Carrillo',
  'ortega': 'Ortega'
}

let data = $ref({}), date = $ref(undefined), dc = $ref(''), mc = $ref('')
getDoc(doc(db, 'cache', 'dining')).then(r => {
  data = JSON.parse(r.data().data)
  date = r.data().date
  dc = cache.get('dining') || Object.keys(data)[0]
})

watch($$(dc), () => {
  cache.set('dining', dc)
  if (!data[dc] || data[dc][mc]) return
  mc = Object.keys(data[dc])[0] // Todo: calculate next mc
})

function getClass (n) {
  if (n.includes('(w/nuts)')) return 'nuts'
  if (n.includes('(v)') || n.includes('(vgn)')) return 'vgn'
  return 'meat'
}
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Dining Commons</h1>
    <p class="text-sm text-gray-500">{{ date || 'Loading' }}</p>
    <div class="flex items-center my-4 flex-wrap">
      <a class="cursor-pointer my-1 mr-2 px-3 py-1 text-sm sm:text-base sm:px-4 sm:py-2 rounded-full border font-bold text-red-400 bg-white flex items-center all-transition hover:shadow" href="https://sso.ucsb.edu/cas/login?service=https%3a%2f%2fstudenthealthoc.sa.ucsb.edu%2f"><heart-icon class="w-5 mr-1" />Open Student Health Badge</a>
      <a class="cursor-pointer my-1 px-3 py-1 text-sm sm:text-base sm:px-4 sm:py-2 rounded-full border font-bold text-blue-500 bg-white flex items-center all-transition hover:shadow" href="https://ucsb-sp.transactcampus.com/eaccounts/AccountSummary.aspx?menu=0"><credit-card-icon class="w-5 mr-1" />Check Meal Plan</a>
    </div>
    <div class="rounded shadow-md p-3 my-4 bg-white" v-if="Object.keys(data).length">
      <h2 class="text-2xl flex items-center">
        Meals
        <select class="text-base bg-white border font-bold mx-2 px-4 py-1 rounded-full appearance-none cursor-pointer" v-model="dc">
          <option v-for="(v, k) in dcs" :value="k">{{ v }}</option>
        </select>
      </h2>
      <p class="flex items-center text-gray-700 my-2" :set="v = data[dc] && data[dc][mc]">
        <select class="px-2 mr-2 appearance-none bg-white font-bold block cursor-pointer border" v-model="mc" v-if="v">
          <option v-for="(v, m) in data[dc]" :value="m">{{ m[0].toUpperCase() + m.substring(1) }}</option>
        </select>
        {{ v ? v.hour : 'closed' }}
      </p>
      <hr class="mt-1 mb-2">
      <div :key="dc + mc" :set="v = data[dc] && data[dc][mc]" class="w-full">
        <wrapper v-if="v" :show="1">
          <div v-for="(names, station) in v.menu" class="px-2">
            <h4 class="font-bold mt-2 mb-1">{{ station }}</h4>
            <div class="ml-1 text-gray-700">
              <div v-for="n in names" class="border-l-2 bg-gradient-to-r to-white px-2" :class="getClass(n)">{{ n }}</div>
            </div>
          </div>
        </wrapper>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meat {
  @apply border-red-400 from-red-50
}
.vgn {
  @apply border-green-400 from-green-50
}
.nuts {
  @apply border-yellow-400 from-yellow-50
}
</style>
