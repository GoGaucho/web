<script setup>
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'

async function login () {
  const provider = new GoogleAuthProvider(), auth = getAuth()
  provider.addScope('https://www.googleapis.com/auth/userinfo.email')
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile')
  provider.setCustomParameters({ hd: 'ucsb.edu' })
  try {
    const res = await signInWithPopup(auth, provider)
    console.log(res)
    const credential = GoogleAuthProvider.credentialFromResult(res)
    console.log(credential)
    const token = credential.accessToken
    const user = res.user
  } catch (e) {
    console.log(e)
  }
}

async function data () {
  const docRef = doc(db, 'cache', 'waitz')
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) console.log(docSnap.data())
}
</script>

<template>
  <h1>GoGaucho</h1>
  <button @click="login">Try to login</button>
  <button @click="data">Try to get data</button>
</template>