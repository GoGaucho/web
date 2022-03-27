<script setup>
import { getDoc, doc } from 'firebase/firestore'
import { db, log } from '../firebase.js'
log('web/poll')

// getDoc(doc(db, 'cache', 'waitz')).then(r => { data = JSON.parse(r.data().data) })
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Daily Poll</h1>
    <p class="text-gray-500">Coming soon!</p>
  </div>
</template>
