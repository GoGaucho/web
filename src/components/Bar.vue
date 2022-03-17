<script setup>
import User from './User.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth'
import { log, state } from '../firebase.js'

const provider = new GoogleAuthProvider(), auth = getAuth()
let gAuth = null
let userInfo = $ref(null), showUser = $ref(false), ready = $ref(false)

async function listener (user) {
  const profile = user.getBasicProfile()
  state.token = user.getAuthResponse().id_token
  if (!profile || !state.token) return userInfo = showUser = null
  await signInWithCredential(auth, GoogleAuthProvider.credential(state.token))
  userInfo = {
    name: profile.getName(),
    photoURL: profile.getImageUrl(),
    email: profile.getEmail()
  }
  log('web_login')
}

gapi.load('auth2', async () => {
  gapi.auth2.init({ client_id: '1083649636208-smr7a1d16cl4bl9ufmn0otn8b1pnk4jc.apps.googleusercontent.com', hosted_domain: 'ucsb.edu' })
  gAuth =  gapi.auth2.getAuthInstance()
  gAuth.then(() => { setTimeout(() => { ready = true }, 500) })
  gAuth.currentUser.listen(listener)
})

function login () {
  gAuth.signIn({ scope: 'profile email' })
}
</script>

<template>
  <div class="relative z-30 w-full px-4 h-14 flex items-center justify-between shadow-xl bg-white">
    <h1 class="text-2xl font-bold flex items-center cursor-pointer group" @click="router.push('/')">
      <img class="mr-2 w-8 rounded" src="/icons/logo.png">GoGaucho
    </h1>
    <template v-if="ready">
      <img v-if="userInfo" class="w-8 rounded-full cursor-pointer" :src="userInfo.photoURL" @click="showUser = true">
      <button v-else @click="login" class="all-transition rounded px-4 py-1 hover:shadow-md bg-blue-500 text-white">Sign in</button>
    </template>
  </div>
  <user v-model="showUser" :user="userInfo" />
</template>