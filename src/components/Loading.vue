<script setup>
import loading from '../assets/loading.svg'
</script>

<template>
  <div class="absolute z-20 top-0 left-0 right-0 bottom-0 flex flex-col items-center justify-between bg-gray-50">
    <div></div>
    <slot></slot>
    <img class="w-40 sm:w-60" :src="loading">
  </div>
</template>