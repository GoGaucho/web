<script setup>
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

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

</script>

<template>
  <h1>GoGaucho</h1>
  <button @click="login">Try to login</button>
</template>