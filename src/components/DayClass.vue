<script setup>
import { onActivated, watch } from 'vue'
import { state, cache } from '../model.js'
import { useRouter } from 'vue-router'
const router = useRouter()
let classes = $ref(false)

function getClasses () {
  const schedule = cache.get('class' + state.quarter)?.schedule
  if (!schedule) return classes = false
  classes = []
  const day = (new Date()).getDay()
  for (const c in schedule) {
    const session = schedule[c].session?.substring(5).trim()
    const periods = schedule[c].periods
    for (const p of periods) {
      for (const w of p.wTime) {
        if (w[0] < (day - 1) * 1440 || w[1] > day * 1440) continue
        classes.push({
          course: c, session,
          location: p.location,
          wTime: w,
          time: p.time.replace(/^(.*?)\s/, '')
        })
      }
    }
  }
  classes.sort((a, b) => a.wTime[0] - b.wTime[0])
}

onActivated(getClasses)
watch(() => state.quarter, getClasses)
</script>

<template>
  <div class="mb-4 sm:mb-8 relative">
    <button v-if="!classes" class="bg-blue-500 rounded px-4 py-2 font-bold text-white all-transition shadow hover:shadow-md" @click="router.push('/class')">Load your classes</button>
    <template v-else>
      <p class="text-gray-500" v-if="classes.length">
        Your classes today <span class="underline text-blue-500 cursor-pointer" @click="router.push('/class')">full schedule</span>
      </p>
      <p class="text-gray-500" v-else>You don't have classes today!👻</p>
      <div class="flex items-center w-full overflow-x-auto">
        <div v-for="c in classes" class="border-2 p-2 m-2" style="border-color: #0b254e; min-width: 10rem;">
          <div>
            <b>{{ c.course }}</b>
            <span class="text-xs ml-1" v-if="c.session">(session {{ c.session }})</span>
          </div>
          <div class="text-sm">{{ c.location }}</div>
          <div class="text-sm">{{ c.time }}</div>
        </div>
      </div>
    </template>
  </div>
</template>