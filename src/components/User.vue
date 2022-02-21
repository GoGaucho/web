<script setup>
import { LogoutIcon } from '@heroicons/vue/outline'
const props = defineProps(['modelValue', 'user'])
const emits = defineEmits(['update:modelValue'])
let style = $computed(() => ({ right: props.modelValue ? 0 : '-18rem' }))
function signOut () {
  const auth = gapi.auth2.getAuthInstance()
  auth.signOut()
}
</script>

<template>
  <transition name="fade">
    <div v-if="props.modelValue" @click="emits('update:modelValue', false)" class="fixed w-full h-screen bg-black opacity-30 z-50 top-0" />
  </transition>
  <div class="all-transition bg-white w-72 h-screen overflow-y-auto top-0 z-50 fixed p-3 sm: p-6" style="max-width: 90vw;" :style="style">
    <div class="flex items-center" v-if="props.user">
      <img :src="props.user.photoURL" class="w-10 mr-4 rounded-full">
      <div>
        <h3 class="text-xl">{{ props.user.name }}</h3>
        <p class="text-sm text-gray-500">{{ props.user.email }}</p>
      </div>
    </div>
    <h2 class="text-2xl" v-else>Please login</h2>
    <div v-if="props.user" class="mt-3">
      <button class="text-gray-500 flex items-center w-full border border-x-0 group" @click="signOut">
        <logout-icon class="all-transition w-6 m-2 group-hover:mr-3" />Sign out
      </button>
    </div>
  </div>
</template>