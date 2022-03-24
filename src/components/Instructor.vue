<script setup>
import { watch } from 'vue'
const props = defineProps(['name'])
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'

let data = $ref(null)
watch(() => props.name, async v => {
  data = null
  if (!v) return
  data = await getDoc(doc(db, 'instructor', v)).then(r => r.data())
})
</script>

<template>
  <transition name="fade">
    <div class="fixed z-50 bottom-4 right-4 w-72 rounded bg-white p-3 ring" v-if="props.name && data">
      <h3 class="font-bold">{{ data.name || props.name }}</h3>
      <p v-if="data.name" class="text-xs text-gray-500">{{ props.name }}</p>
      <p v-if="data.email" class="text-sm select-all"><a :href="'mailto:' + data.email">{{ data.email }}</a></p>
      <hr class="my-1">
      <p v-if="data.gpa">Avg. GPA: <span class="font-bold">{{ data.gpa.toFixed(2) }}</span></p>
      <p class="text-xs text-gray-300">Based on 2015-2021 public grades</p>
    </div>
  </transition>
</template>