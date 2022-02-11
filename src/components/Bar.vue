<script setup>
import User from './User.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth'
import { UserCircleIcon } from '@heroicons/vue/solid'
import { log } from '../firebase.js'

const provider = new GoogleAuthProvider(), auth = getAuth()
let userInfo = $ref(null), showUser = $ref(false)

async function listener (user) {
  const profile = user.getBasicProfile()
  gapi.token = user.getAuthResponse().id_token
  if (!profile || !gapi.token) return userInfo = showUser = null
  await signInWithCredential(auth, GoogleAuthProvider.credential(gapi.token))
  userInfo = {
    name: profile.getName(),
    photoURL: profile.getImageUrl(),
    email: profile.getEmail()
  }
}

gapi.load('auth2', async () => {
  gapi.auth2.init({ client_id: '1083649636208-smr7a1d16cl4bl9ufmn0otn8b1pnk4jc.apps.googleusercontent.com', hosted_domain: 'ucsb.edu' })
  gapi.auth2.getAuthInstance().currentUser.listen(listener)
})

function login () {
  const auth = gapi.auth2.getAuthInstance()
  auth.signIn({ scope: 'profile email' })
  log('login')
}
</script>

<template>
  <div class="sticky top-0 z-20 w-full px-4 h-14 flex items-center justify-between shadow-xl bg-white">
    <h1 class="text-2xl font-bold flex items-center cursor-pointer group" @click="router.push('/')">
      <img class="mr-2 w-8 rounded" src="/logo.png">GoGaucho
    </h1>
    <img v-if="userInfo" class="w-8 rounded-full cursor-pointer" :src="userInfo.photoURL" @click="showUser = true">
    <user-circle-icon v-else @click="login" class="w-8 cursor-pointer text-gray-500" />
  </div>
  <user v-model="showUser" :user="userInfo" />
</template>