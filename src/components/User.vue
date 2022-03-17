<script setup>
import { onMounted } from 'vue'
import { CalendarIcon } from '@heroicons/vue/outline'
import Wrapper from './Wrapper.vue'
import { useRouter } from 'vue-router'
const router = useRouter()

let showPanel = $ref(false), user = $ref({})

function goto (path) {
  router.push(path)
  showPanel = false
}

// following are authentication logic
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth'
import { log } from '../firebase.js'

const provider = new GoogleAuthProvider(), auth = getAuth(), LS = window.localStorage
async function listener (raw) {
  showPanel = false
  const token = raw.credential
  if (!token) return
  const res = await signInWithCredential(auth, GoogleAuthProvider.credential(token)).catch(() => false)
  if (!res?.user) {
    if (LS.token) google.accounts.id.prompt()
    delete LS.token
    user = {}
    return
  }
  user = {
    name: res.user.displayName,
    email: res.user.email,
    photoURL: res.user.photoURL
  }
  if (!LS.token) showPanel = true
  LS.token = token
  log('web_login')
}

google.accounts.id.initialize({
  client_id: '1083649636208-smr7a1d16cl4bl9ufmn0otn8b1pnk4jc.apps.googleusercontent.com',
  hosted_domain: 'ucsb.edu',
  auto_select: true,
  cancel_on_tap_outside: false,
  callback: listener
})

if (LS.token) listener({ credential: LS.token })
else google.accounts.id.prompt()
onMounted(() => {
  google.accounts.id.renderButton(document.getElementById('signin'), { type: 'icon', size: 'medium', shape: 'circle' })
})

function signOut () {
  showPanel = false
  user = {}
  delete LS.token
  auth.signOut()
}
</script>

<template>
  <div id="signin" :class="user.name ? 'hidden' : ''" />
  <img v-if="user.photoURL" class="w-8 rounded-full cursor-pointer" :src="user.photoURL" @click="showPanel = true">
  <transition name="fade">
    <div v-if="showPanel" @click="showPanel = false" class="fixed w-full h-screen bg-transparant z-50 top-0" />
  </transition>
  <div class="fixed z-50 top-16 w-72 rounded shadow-lg bg-white all-transition" :class="showPanel ? 'right-2' : '-right-72'">
    <wrapper :show="showPanel" class="pt-4 flex flex-col items-center">
      <img :src="user.photoURL" class="w-16 rounded-full">
      <h3 class="text-xl">{{ user.name }}</h3>
      <p class="text-sm text-gray-500">{{ user.email }}</p>
      <button class="all-transition text-gray-500 border rounded px-4 py-1 my-2 hover:bg-gray-50" @click="signOut">Sign out</button>
      <button class="all-transition w-full text-gray-500 flex items-center px-6 py-3 border border-x-0 hover:bg-gray-50" @click="goto('/schedule')">
        <calendar-icon class="w-6 mr-2" />Weekly Schedule
      </button>
      <div class="rounded-b bg-gray-100 text-gray-500 text-sm py-2 flex items-center justify-around w-full">
        <p class="cursor-pointer" @click="goto('/about')">About</p>
        <p>&copy; GoGaucho 2022</p>
      </div>
    </wrapper>
  </div>
</template>