<script setup>
import Wrapper from './Wrapper.vue'
import * as lookup from '../utils/lookup.js'
const props = defineProps(['data'])
</script>

<template>
  <Wrapper :show="1" class="p-2">
    <div class="rounded shadow-md overflow-hidden bg-white my-2">
      <div class="text-white font-bold p-2" style="background: #0b254e;">Personal Information</div>
      <div class="mx-4 my-2"><b>Perm Number: </b><code>{{ props.data.perm }}</code></div>
      <div class="mx-4 my-2"><b>Class Level: </b><code>{{ lookup.classLevel[props.data.classLevel] }}</code></div>
      <div class="mx-4 my-2"><b>Classification: </b><code>{{ lookup.classification[props.data.classification] }}</code></div>
    </div>
    <div class="rounded shadow-md overflow-hidden bg-white my-2">
      <div class="text-white font-bold p-2" style="background: #0b254e;">Registration</div>
      <div class="mx-4 my-2"><b>Status: </b><code>{{ lookup.regStatus[props.data.regStatus] }}</code></div>
      <div class="mx-4 my-2"><b>Fee Status: </b><code>{{ lookup.feeStatus[props.data.feeStatus] }}</code></div>
      <div class="mx-4 my-2"><b>Units: </b><code>{{ props.data.units }}</code></div>
    </div>
    <div class="rounded shadow-md overflow-hidden bg-white my-2">
      <div class="text-white font-bold p-2" style="background: #0b254e;">Pass Time</div>
      <div class="mx-4 my-2"><b>Pass 1: </b><code>{{ props.data.pass1.replace('T', ' ') }}</code></div>
      <div class="mx-4 my-2"><b>Pass 2: </b><code>{{ props.data.pass2.replace('T', ' ') }}</code></div>
      <div class="mx-4 my-2"><b>Pass 3: </b><code>{{ props.data.pass3.replace('T', ' ') }}</code></div>
    </div>
  </Wrapper>
</template>