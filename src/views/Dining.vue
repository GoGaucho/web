<script setup>
import { watch } from 'vue'
import { get, log } from '../firebase.js'
import { cache } from '../model.js'
import { CreditCardIcon, HeartIcon, VideoCameraIcon, ArrowRightCircleIcon, ArrowLeftCircleIcon } from '@heroicons/vue/24/outline'
import Wrapper from '../components/Wrapper.vue'
log('web/dining')

const dcs = {
  'de-la-guerra': 'De La Guerra',
  'portola': 'Portola',
  'carrillo': 'Carrillo',
  'ortega': 'Ortega'
}

let data = $ref({}), date = $ref(undefined), dc = $ref(''), mc = $ref(''), isNext = $ref(false)

watch($$(isNext), v => {
  get('cache/dining' + (v ? '-next' : '')).then(r => {
    data = JSON.parse(r.data)
    date = r.date
    dc = cache.get('dining') || Object.keys(data)[0]
  })
}, { immediate: true })

function isPast (period) {
  const m = period.match(/\s\-\s(\d*?):(\d*?)\s(\w)M$/)
  if (!m) return false
  const d = new Date()
  const dTime = (Number(m[1]) + (m[3] === 'P' ? 12 : 0)) * 60 + Number(m[2])
  return dTime < d.getHours() * 60 + d.getMinutes()
}

watch($$(dc), () => {
  cache.set('dining', dc)
  if (!data[dc] || data[dc][mc]) return
  mc = ''
  for (const m in data[dc]) {
    mc = m
    if (!isPast(data[dc][m].hour)) break
  }
})

function getClass (n) {
  if (n.includes('(w/nuts)')) return 'nuts'
  if (n.includes('(v)') || n.includes('(vgn)')) return 'vgn'
  return 'meat'
}

function showCam () {
  Swal.fire({ title: dcs[dc], showConfirmButton: false, html: `<img src="https://api.ucsb.edu/dining/cams/v2/stream/${dc}?ucsb-api-key=%20s5MpI868GtPpozL8Q6bfnmMMIUXDeznl">` })
}
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Dining Commons</h1>
    <p class="text-sm text-gray-500 flex items-center">
      <ArrowLeftCircleIcon v-if="date && isNext" class="cursor-pointer w-5 mx-2" @click="isNext = false" />
      {{ date || 'Loading' }}
      <ArrowRightCircleIcon v-if="date && !isNext" class="cursor-pointer w-5 mx-2" @click="isNext = true" />
    </p>
    <div class="flex items-center my-4 flex-wrap">
      <a class="cursor-pointer my-1 px-3 py-1 text-sm sm:text-base sm:px-4 sm:py-2 rounded-full border font-bold text-blue-500 bg-white flex items-center all-transition hover:shadow" href="https://ucsb-sp.transactcampus.com/eaccounts/AccountSummary.aspx?menu=0"><CreditCardIcon class="w-5 mr-1" />Check Meal Plan</a>
    </div>
    <div class="rounded shadow-md p-3 my-4 bg-white" v-if="Object.keys(data).length" :key="date">
      <h2 class="text-2xl flex items-center">
        Meals
        <select class="text-base bg-white border font-bold mx-2 px-4 py-1 rounded-full appearance-none cursor-pointer" v-model="dc">
          <option v-for="(v, k) in dcs" :value="k">{{ v }}</option>
        </select>
        <VideoCameraIcon class="w-6 ml-2 cursor-pointer text-gray-500" @click="showCam" />
      </h2>
      <p class="flex items-center text-gray-700 my-2" :set="v = data[dc] && data[dc][mc]">
        <select class="px-2 mr-2 appearance-none bg-white font-bold block rounded cursor-pointer border" v-model="mc" v-if="v">
          <option v-for="(v, m) in data[dc]" :value="m">{{ m[0].toUpperCase() + m.substring(1) }}</option>
        </select>
        {{ v ? v.hour : 'closed' }}
      </p>
      <hr class="mt-1 mb-2">
      <div :key="dc + mc" :set="v = data[dc] && data[dc][mc]" class="w-full">
        <Wrapper v-if="v" :show="1">
          <div v-for="(names, station) in v.menu" class="px-2">
            <h4 class="font-bold mt-2 mb-1">{{ station }}</h4>
            <div class="ml-1 text-gray-700">
              <div v-for="n in names" class="border-l-2 bg-gradient-to-r to-white px-2" :class="getClass(n)">{{ n }}</div>
            </div>
          </div>
        </Wrapper>
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
