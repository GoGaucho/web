<script setup>
import { onMounted } from 'vue'
import { ClipboardIcon } from '@heroicons/vue/outline'
import { useRoute } from 'vue-router'
const embed = useRoute().query.embed
let map = null, self = null, selfPos = null

function init () {
  const pos = { lat: 34.415729, lng: -119.845990 }
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 17,
    fullscreenControl: false,
    center: pos,
  })
}

if (!window.google) window.initMap = init
else onMounted(init)

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(position => {
    if (!map) return
    const pos = { lat: position.coords.latitude, lng: position.coords.longitude, }
    if (!self) map.panTo(pos)
    if (!self) self = new google.maps.Marker({ position: pos, map, icon: { path: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z', fillColor: '#337CFF', fillOpacity: 1, strokeColor: '#337CFF' } })
    self.setPosition(pos)
    selfPos = pos
  })
}

function record () {
  Swal.fire('Current Location', JSON.stringify(selfPos), 'info')
}
</script>

<template>
  <div class="w-full" :style="{ height: embed ? '100vh' : 'calc(100vh - 3.5rem)' }" id="map"></div>
  <button class="fixed left-10 bottom-10 p-3 bg-gray-700 shadow rounded-full" @click="record"><clipboard-icon class="w-6 text-white" /></button>
</template>