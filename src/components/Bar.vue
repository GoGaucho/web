<script setup>
import User from './User.vue'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter(), route = useRoute()
import { HomeIcon, MapIcon, BookOpenIcon, AcademicCapIcon, LightBulbIcon } from '@heroicons/vue/24/outline'
import { HomeIcon as SolidHomeIcon, MapIcon as SolidMapIcon, BookOpenIcon as SolidBookOpenIcon, AcademicCapIcon as SolidAcademicCapIcon, LightBulbIcon as SolidLightBulbIcon } from '@heroicons/vue/24/solid'

const tabs = [{
  icon: HomeIcon,
  solid: SolidHomeIcon,
  path: '/'
}, {
  icon: MapIcon,
  solid: SolidMapIcon,
  path: '/map'
}, {
  icon: AcademicCapIcon,
  solid: SolidAcademicCapIcon,
  path: '/class'
}, {
  icon: BookOpenIcon,
  solid: SolidBookOpenIcon,
  path: '/course',
}, {
  icon: LightBulbIcon,
  solid: SolidLightBulbIcon,
  path: '/about'
}]

let page = $computed(() => {
  const res = {
    '/': 0,
    '/map': 1,
    '/class': 2,
    '/course': 3,
    '/planner': 3,
    '/about': 4
  }[route.path]
  return res === undefined ? -1 : res
})

</script>

<template>
  <div class="relative z-30 w-full px-4 h-14 flex items-center justify-between shadow bg-white">
    <div class="flex items-center">
      <h1 class="text-2xl font-bold flex items-center cursor-pointer group" @click="router.push('/')">
        <img class="mr-2 w-8 rounded" src="/icons/logo.png">GoGaucho
      </h1>
      <div class="flex overflow-hidden bg-white fixed bottom-0 left-0 sm:relative w-screen sm:w-60 sm:mx-5 border-t-2 sm:border-none"><!-- tab -->
        <div v-for="(t, i) in tabs" class="flex-grow flex flex-col items-center justify-center px-1 cursor-pointer h-14" @click="router.push(t.path)" :class="page === i ? 'text-selected' : 'text-gray-500'">
          <div class="relative w-7 h-7">
            <Transition name="fade">
              <Component v-if="page === i" :is="t.solid" class="absolute w-7" />
              <Component v-else :is="t.icon" class="absolute w-7" />
            </Transition>            
          </div>
        </div>
        <div class="all-transition absolute bottom-0 h-1 rounded-full" style="background: #0b254e;" :style="{ width: 100 / tabs.length + '%', left: page * 100 / tabs.length + '%' }" />
      </div>
    </div>
    <User></User>
  </div>
</template>

<style scoped>
.text-selected {
  color: #0b254e;
}
</style>
