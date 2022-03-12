<script setup>
import { Loader } from 'google-maps'

let map = null, self = null, selfBlur = null, marker = null, selfPos = null

const ll = s => ({ lat: Number(s.split(',')[0]), lng: Number(s.split(',')[1]) })

function onzoom () {
  const Z = 20
  const z = map.getZoom(), scale = Math.max(1.4, selfPos.acc / Math.pow(2, Z - z))
  selfBlur.setIcon({
    path: 'm -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0',
    fillColor: '#4285F4', fillOpacity: 0.3, strokeOpacity: 0, scale
  })
}

function listener (e) {
  const p = { lat: e.coords.latitude, lng: e.coords.longitude, acc: e.coords.accuracy }
  self.setPosition(p)
  selfBlur.setPosition(p)
  if (!selfPos) map.setCenter(p)
  selfPos = p
  onzoom()
}
// 'm -r,0 a r,r 0 1,0 (r * 2),0 a r,r 0 1,0 -(r * 2),0'
async function init () {
  const loader = new Loader('AIzaSyAouu4HsmxgvwGhq0rFOgdw2jbD9bPgN9Y')
  const google = await loader.load()
  map = new google.maps.Map(document.getElementById('map'), { center: ll('34.413604, -119.848901'), zoom: 16, fullscreenControl: false })
  marker = new google.maps.Marker({ position: ll('0, 0'), map })
  selfBlur = new google.maps.Marker({ position: ll('0, 0'), map, zIndex: 1 })
  self = new google.maps.Marker({ position: ll('0, 0'), map, zIndex: 2, icon: {
    path: 'm -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0',
    fillColor: '#4285F4', fillOpacity: 1, strokeColor: 'white', strokeWeight: 3
  } })
  map.zoom_changed = onzoom
  navigator.geolocation.watchPosition(listener, () => {}, { enableHighAccuracy: true })
}
init()
</script>

<template>
  <div class="w-full h-full flex flex-col relative items-center">
    <div class="w-full h-full relative" id="map" />
  </div>
</template>