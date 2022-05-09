<script setup>
const props = defineProps(['href', 'icon', 'title', 'description'])
</script>

<template>
  <a class="w-full m-2 all-transition rounded flex items-center bg-gradient-to-r from-white to-gray-100 sm:to-white p-2 sm:border hover:shadow hover:from-blue-50" :href="props.href" style="min-width: 18rem;">
    <picture>
      <source :srcset="props.icon">
      <img class="rounded mr-2 object-cover object-top" style="width: 2.5rem; max-height: 2.5rem;" src="/icons/links/UCSB.jpg">
    </picture>
    <div class="flex-grow">
      <h4 class="font-bold">{{ props.title }}</h4>
      <p class="text-xs text-gray-500">{{ props.description }}</p>
    </div>
  </a>
</template>