<script setup>
import { Loader } from 'google-maps'

Swal.fire('Notice', 'The map feature is still under development. Locations and classrooms search is coming soon.', 'info')

let map = null, self = null, selfBlur = null, marker = null
let selfPos = $ref(null)

const ll = s => ({ lat: Number(s.split(',')[0]), lng: Number(s.split(',')[1]) })

function center () {
  if (!selfPos) {
    navigator.geolocation.watchPosition(listener, () => {}, { enableHighAccuracy: true })
    return
  }
  map.panTo(selfPos)
}

function debug () {
  if (!selfPos) return
  Swal.fire('Current Position', `${selfPos.lat}, ${selfPos.lng}<br>acc = ${selfPos.acc}`, 'info')
}

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
    <button class="all-transition fixed right-2.5 bottom-48 rounded-sm bg-white shadow p-2" :class="selfPos ? 'text-blue-500' : 'text-gray-500'" @click="center" @dblclick="debug">
      <svg class="w-6" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z" />
      </svg>
    </button>
  </div>
</template>