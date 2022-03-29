<script setup>
import { onMounted, watch } from 'vue'
import { CalendarIcon } from '@heroicons/vue/outline'
import Wrapper from './Wrapper.vue'
import { state, cache } from '../model.js'
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth'
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
auth.onAuthStateChanged(u => {
  state.user = {}
  if (u) state.user = {
    uid: u.uid,
    name: u.displayName,
    email: u.email,
    photoURL: u.photoURL
  }
})

async function listener (token) {
  showPanel = state.showLogin = false
  if (!token) return
  cache.set('token', token, 3000e3)
  if (window.onlogin) window.onlogin()
  await signInWithCredential(auth, GoogleAuthProvider.credential(token))
  log('web_login')
}

google.accounts.id.initialize({
  client_id: '1083649636208-smr7a1d16cl4bl9ufmn0otn8b1pnk4jc.apps.googleusercontent.com',
  hosted_domain: 'ucsb.edu',
  auto_select: true,
  cancel_on_tap_outside: false,
  callback: c => listener(c.credential)
})

setTimeout(() => {
  if (!state.user.name) google.accounts.id.prompt()
}, 2e3)

watch(() => state.showLogin, v => {
  if (v) google.accounts.id.prompt()
})

onMounted(() => {
  google.accounts.id.renderButton(document.getElementById('signin-icon'), { type: 'icon', size: 'medium', shape: 'circle' })
  google.accounts.id.renderButton(document.getElementById('signin-btn'), { theme: 'outline' })
})

function signOut () {
  showPanel = false
  state.user = {}
  cache.set('token', false, 0)
  auth.signOut()
}
</script>

<template>
  <div id="signin-icon" :class="state.user.name ? 'invisible absolute' : ''" />
  <img v-if="state.user.photoURL" class="w-8 rounded-full cursor-pointer" :src="state.user.photoURL" @click="showPanel = true">
  <transition name="fade">
    <div v-if="showPanel || state.showLogin" @click="showPanel = state.showLogin = false" class="fixed w-full h-screen bg-transparant z-50 top-0" />
  </transition>
  <div class="fixed z-50 top-16 w-72 rounded shadow-lg bg-white all-transition" :class="showPanel ? 'right-2' : '-right-72'">
    <wrapper :show="showPanel" class="pt-4 flex flex-col items-center">
      <img :src="state.user.photoURL" class="w-16 rounded-full">
      <h3 class="text-xl">{{ state.user.name }}</h3>
      <p class="text-sm text-gray-500">{{ state.user.email }}</p>
      <button class="all-transition text-gray-500 border rounded px-4 py-1 my-2 hover:bg-gray-50" @click="signOut">Sign out</button>
      <button class="all-transition w-full text-gray-500 flex items-center px-6 py-3 border border-x-0 hover:bg-gray-50" @click="goto('/class')">
        <calendar-icon class="w-6 mr-2" />My Classes
      </button>
      <div class="rounded-b bg-gray-100 text-gray-500 text-sm py-2 flex items-center justify-around w-full">
        <p class="cursor-pointer" @click="goto('/about')">About</p>
        <p>&copy; GoGaucho 2022</p>
      </div>
    </wrapper>
  </div>
  <div class="fixed z-50 top-16 w-72 rounded shadow-lg bg-white all-transition" :class="state.showLogin ? 'right-2' : '-right-72'">
    <wrapper :show="state.showLogin" class="p-4 pt-2 flex flex-col items-center">
      <p class="w-full text-left text-gray-500 mb-2">Please verify your identity</p>
      <div id="signin-btn" />
    </wrapper>
  </div>
</template>