<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
import { UserCircleIcon } from '@heroicons/vue/solid'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

let avatar = $ref('')
const auth = getAuth()
auth.onAuthStateChanged(user => {
  avatar = user?.photoURL
})

function login () {
  const provider = new GoogleAuthProvider()
  provider.addScope('email')
  provider.addScope('profile')
  provider.setCustomParameters({ hd: 'ucsb.edu' })
  signInWithPopup(auth, provider)
}
</script>

<template>
  <div class="sticky top-0 w-full px-4 h-14 flex items-center justify-between shadow-xl bg-white">
    <h1 class="text-2xl font-bold flex items-center cursor-pointer group" @click="router.push('/')">
      <img class="mr-2 w-8 rounded" src="/logo.png">GoGaucho
    </h1>
    <img v-if="avatar" class="w-8 rounded-full" :src="avatar">
    <user-circle-icon v-else @click="login" class="w-8 cursor-pointer text-gray-500" />
  </div>
</template>