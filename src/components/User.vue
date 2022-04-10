<script setup>
import { CalendarIcon } from '@heroicons/vue/outline'
import Wrapper from './Wrapper.vue'
import { state, cache } from '../model.js'
import { getAuth, signInWithCredential, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { log } from '../firebase.js'
import { useRouter } from 'vue-router'
const router = useRouter()

if (state.isStandalone) log('web_standalone')

let showPanel = $ref(false)
function goto (path) {
  router.push(path)
  showPanel = false
}

// following are authentication logic
const provider = new GoogleAuthProvider(), auth = getAuth()
provider.setCustomParameters({ hd: 'ucsb.edu' })

google.accounts.id.initialize({
  client_id: '1083649636208-smr7a1d16cl4bl9ufmn0otn8b1pnk4jc.apps.googleusercontent.com',
  hosted_domain: 'ucsb.edu',
  auto_select: true,
  cancel_on_tap_outside: false,
  callback: listener
})

// listeners
function success (t) {
  cache.set('token', t, 3500e3)
  if (window.onsignin) window.onsignin()
  log('web_login')
}

async function listener (c) {
  showPanel = false
  if (!c.credential) return
  await signInWithCredential(auth, GoogleAuthProvider.credential(c.credential))
  success(c.credential)
}

let init = true
auth.onAuthStateChanged(u => {
  state.user = {}
  if (u) state.user = {
    uid: u.uid,
    name: u.displayName,
    email: u.email,
    photoURL: u.photoURL
  }
  if (!u && init) google.accounts.id.prompt()
  init = false
})

// manual signin
async function signin () {
  const res = await signInWithPopup(auth, provider).catch(() => false)
  if (!res) return
  const credential = GoogleAuthProvider.credentialFromResult(res)
  success(credential.idToken)
}
window.signin = signin

function signout () {
  showPanel = false
  state.user = {}
  cache.set('token', false, 0)
  auth.signOut()
}
</script>

<template>
  <transition name="fade" mode="out-in">
    <img v-if="state.user.photoURL" class="w-8 rounded-full cursor-pointer" :src="state.user.photoURL" @click="showPanel = true">
    <button v-else class="all-transition shadow hover:shadow-md rounded bg-blue-500 text-white font-bold px-3 py-1" @click="signin">Sign in</button>
  </transition>
  <transition name="fade">
    <div v-if="showPanel" @click="showPanel = false" class="fixed w-full h-screen bg-transparant z-50 top-0" />
  </transition>
  <div class="fixed z-50 top-16 w-72 rounded shadow-lg bg-white all-transition" :class="showPanel ? 'right-2' : '-right-72'">
    <wrapper :show="showPanel" class="pt-4 flex flex-col items-center">
      <img :src="state.user.photoURL" class="w-16 rounded-full">
      <h3 class="text-xl">{{ state.user.name }}</h3>
      <p class="text-sm text-gray-500">{{ state.user.email }}</p>
      <button class="all-transition text-gray-500 border rounded px-4 py-1 my-2 hover:bg-gray-50" @click="signout">Sign out</button>
      <button class="all-transition w-full text-gray-500 flex items-center px-6 py-3 border border-x-0 hover:bg-gray-50" @click="goto('/class')">
        <calendar-icon class="w-6 mr-2" />My Classes
      </button>
      <div class="rounded-b bg-gray-100 text-gray-500 text-sm py-2 flex items-center justify-around w-full">
        <p class="cursor-pointer" @click="goto('/about')">About</p>
        <p>&copy; GoGaucho 2022</p>
      </div>
    </wrapper>
  </div>
</template>