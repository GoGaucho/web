<script setup>
const props = defineProps(['href', 'icon', 'title', 'description', 'small'])
let width = $computed(() => props.small ? '1.8rem' : '2.5rem')
</script>

<template>
  <a class="w-full all-transition rounded flex items-center justify-start text-left bg-gradient-to-r from-white to-gray-100 sm:to-white p-2 sm:border hover:shadow hover:from-blue-50" :href="props.href">
    <picture>
      <source :srcset="props.icon">
      <img class="rounded mr-2 object-cover object-top" :style="{ width, maxHeight: width }" src="/icons/links/UCSB.jpg">
    </picture>
    <div class="flex-grow">
      <h4 class="font-bold" :class="props.small && 'text-sm'">{{ props.title }}</h4>
      <p class="text-xs text-gray-500">{{ props.description }}</p>
    </div>
  </a>
</template>