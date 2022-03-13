<script setup>
import { CalendarIcon } from '@heroicons/vue/outline'
import Wrapper from './Wrapper.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const props = defineProps(['modelValue', 'user'])
const emits = defineEmits(['update:modelValue'])

function signOut () {
  gapi.auth2.getAuthInstance().signOut()
}

function goto (path) {
  router.push(path)
  emits('update:modelValue', false)
}
</script>

<template>
  <transition name="fade">
    <div v-if="props.modelValue" @click="emits('update:modelValue', false)" class="fixed w-full h-screen bg-transparant z-50 top-0" />
  </transition>
  <div class="fixed z-50 top-16 w-72 rounded shadow-md bg-white all-transition" :class="props.modelValue ? 'right-2' : '-right-72'" v-if="props.user">
    <wrapper :show="props.modelValue" class="pt-4 flex flex-col items-center">
      <img :src="props.user.photoURL" class="w-16 rounded-full">
      <h3 class="text-xl">{{ props.user.name }}</h3>
      <p class="text-sm text-gray-500">{{ props.user.email }}</p>
      <button class="all-transition text-gray-500 border rounded px-4 py-1 my-2 hover:bg-gray-100" @click="signOut">Sign out</button>
      <button class="all-transition w-full text-gray-500 flex items-center px-6 py-3 border border-x-0 hover:bg-gray-100" @click="goto('/schedule')">
        <calendar-icon class="w-6 mr-2" />Weekly Schedule
      </button>
      <div class="rounded-b bg-gray-100 text-gray-500 text-sm py-2 flex items-center justify-around w-full">
        <p class="cursor-pointer" @click="goto('/about')">About</p>
        <p>&copy; GoGaucho 2022</p>
      </div>
    </wrapper>
  </div>
</template>