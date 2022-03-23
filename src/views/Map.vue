<script setup>
import { log } from '../firebase.js'
import { XIcon } from '@heroicons/vue/outline'
import { Loader } from 'google-maps'
import locations from '../utils/locations.js'
import debounce from '../utils/debounce.js'
import Wrapper from '../components/Wrapper.vue'
log('web/map')

const ll = s => ({ lat: Number(s.split(',')[0]), lng: Number(s.split(',')[1]) })

let map = null, self = null, selfBlur = null, marker = null
let selfPos = $ref(null)

function center () {
  result = []
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
  map = new google.maps.Map(document.getElementById('map'), { center: ll('34.413604, -119.848901'), zoom: 16, fullscreenControl: false, mapTypeControl: false })
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

// following for search
let query = $ref(''), result = $ref([])

const computeResult = debounce(() => {
  if (marker) marker.setPosition(ll('0,0'))
  if (!query) return result = []
  const res = new Set(), qu = query.toUpperCase()
  for (const k in locations) {
    if (k.toUpperCase().indexOf(qu) === 0) res.add(k)
  }
  if (qu.length > 2) {
    for (const k in locations) {
      if (k.toUpperCase().indexOf(qu) > 0) res.add(k)
    }
  }
  result = [...res]
})

function focus (r) {
  query = r
  result = []
  const pos = ll(locations[r])
  if (marker) marker.setPosition(pos)
  if (map) map.panTo(pos)
}

function clear () {
  query = ''
  if (selfPos && map) map.panTo(selfPos)
  computeResult()
}
</script>

<template>
  <div class="w-full h-full flex flex-col relative items-center">
    <div class="w-full h-full relative" id="map" @click="result = []" />
    <button class="all-transition fixed right-2.5 bottom-48 rounded-sm bg-white shadow p-2" :class="selfPos ? 'text-blue-500' : 'text-gray-500'" @click="center" @dblclick="debug">
      <svg class="w-6" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z" />
      </svg>
    </button>
    <div class="absolute top-3 mx-auto w-96 bg-white shadow-md rounded" style="max-width: 90%;">
      <input v-model="query" @input="computeResult" placeholder="Search locations" class="px-3 py-1.5 w-full rounded font-bold">
      <x-icon v-if="query" @click="clear" class="w-5 text-gray-500 absolute cursor-pointer right-2 top-2 bg-white" />
      <hr v-if="result.length" class="w-full">
      <wrapper :show="result.length" class="h-60 overflow-y-auto px-2 text-gray-500 text-sm">
        <div v-for="r in result" @click="focus(r)" class="cursor-pointer py-1">{{ r }}</div>
      </wrapper>
    </div>
  </div>
</template>