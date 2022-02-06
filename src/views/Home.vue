<script setup>
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'

async function data () {
  const docRef = doc(db, 'cache', 'waitz')
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) console.log(docSnap.data())
}

async function call () {
  const functions = getFunctions()
  const cache = httpsCallable(functions, 'cache')
  cache({}).then(console.log)
}
</script>

<template>
  <h1>Home Page</h1>
  <button @click="data">Try to get data</button><br>
  <button @click="call">Try to call function</button><br>
</template>