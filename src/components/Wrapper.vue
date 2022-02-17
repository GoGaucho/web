<!-- 2021-12-17 -->
<script setup>
import { watch, nextTick } from 'vue'
const props = defineProps(['show', 'class'])
let outer = $ref(), inner = $ref(), height = $ref('0px')

const H = el => window.getComputedStyle(el).getPropertyValue('height')

watch(() => props.show, async v => {
  while (!inner || !outer) await new Promise(r => setTimeout(r))
  await nextTick()
  if (height == 'auto') {
    height = H(outer)
    await new Promise(r => setTimeout(r))
  }
  if (!v) height = '0px'
  else {
    height = H(inner)
    setTimeout(() => { if (props.show) height = 'auto' }, 500)
  }
}, { immediate: true })
</script>

<template>
  <div ref="outer" style="overflow-y: hidden; transition: all 0.5s ease; max-width: 100%;" :style="{ height: height, opacity: props.show ? 1 : 0 }">
    <div ref="inner" style="max-width: 100%;" :class="props.class">
      <slot></slot>
    </div>
  </div>
</template>
