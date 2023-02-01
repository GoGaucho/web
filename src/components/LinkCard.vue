<script setup>
const props = defineProps(['href', 'icon', 'title', 'description'])
</script>

<template>
  <a class="w-full all-transition rounded flex items-center justify-start text-left bg-gradient-to-r from-white to-white p-2 sm:border hover:shadow hover:from-blue-50 hover:to-white" :href="props.href">
    <picture>
      <source :srcset="props.icon">
      <img class="rounded mr-2 object-cover object-top w-[2.5rem]" style="max-height: 2.5rem;" src="/icons/links/UCSB.jpg">
    </picture>
    <div class="flex-grow">
      <h4 class="font-bold">{{ props.title }}</h4>
      <p class="text-xs text-gray-500">{{ props.description }}</p>
    </div>
  </a>
</template>
