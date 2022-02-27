<script setup>
import { watch } from 'vue'
import { call, state } from '../firebase.js'
watch(() => state.token, async v => {
  if (!v) return
  console.time('fetch')
  await call('student', { token: state.token }).then(console.log)
  console.timeEnd('fetch')
})
</script>

<template>
  <h1>Schedule Page</h1>
</template>