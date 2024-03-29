<script setup>
import { onMounted, onActivated } from 'vue'
import { log } from '../firebase.js'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { locations, classrooms } from '../utils/locations.js'
import debounce from '../utils/debounce.js'
import Wrapper from '../components/Wrapper.vue'
import markerIcon from '../assets/marker.webp'
import { useRoute } from 'vue-router'
const route = useRoute()
log('web/map')

// OpenLayers
import Feature from 'ol/Feature'
import Geolocation from 'ol/Geolocation'
import Map from 'ol/Map'
import Point from 'ol/geom/Point'
import View from 'ol/View'
import { fromLonLat } from 'ol/proj'
import { Circle as CircleStyle, Fill, Stroke, Style, Icon } from 'ol/style'
import { OSM, Vector as VectorSource } from 'ol/source'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import { Control, defaults as defaultControls } from 'ol/control'
import 'ol/ol.css'

// Maps
let el = $ref()

const view = new View({ center: [0, 0], zoom: 16 })
const ll = s => fromLonLat([Number(s.split(',')[1]), Number(s.split(',')[0])], view.getProjection())
view.setCenter(ll('34.4125712, -119.8468763'))

const geolocation = new Geolocation({
  trackingOptions: { enableHighAccuracy: true },
  projection: view.getProjection()
})
geolocation.setTracking(true)

const accuracyFeature = new Feature()
geolocation.on('change:accuracyGeometry', function () {
  accuracyFeature.setGeometry(geolocation.getAccuracyGeometry())
})

const positionFeature = new Feature()
positionFeature.setStyle(new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#3399CC' }),
    stroke: new Stroke({ color: '#fff', width: 2 })
  })
}))

const markerFeature = new Feature()
let selfPos = null
geolocation.on('change:position', function () {
  selfPos = geolocation.getPosition()
  positionFeature.setGeometry(selfPos ? new Point(selfPos) : null)
})

class CenterControl extends Control {
  constructor (opt_options) {
    const options = opt_options || {}
    const button = document.createElement('button')
    button.innerHTML = '<svg style="width: 80%; height: 80%; margin: auto;" viewBox="0 0 24 24"><path fill="currentColor" d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z" /></svg>'
    const element = document.createElement('div')
    element.className = 'center-control ol-unselectable ol-control'
    element.appendChild(button)
    super({ element: element, target: options.target })
    button.addEventListener('click', this.handle.bind(this), false)
  }
  handle () {
    if (!selfPos) {
      geolocation.setTracking(false)
      geolocation.setTracking(true)
      return
    }
    this.getMap().getView().animate({ center: selfPos, zoom: 17, rotation: 0 })
  }
}

let map = null
onMounted(() => {
  map = new Map({
    controls: defaultControls().extend([new CenterControl()]),
    layers: [ new TileLayer({ source: new OSM() }) ],
    target: el, view
  })
  new VectorLayer({ // self position
    map, source: new VectorSource({ features: [accuracyFeature, positionFeature, markerFeature] })
  })
  markerFeature.setStyle(new Style({
    image: new Icon({
      anchor: [0.5, 0.95],
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
      src: markerIcon,
      scale: 0.07
    })
  }))
  if (route.query.q) focus(route.query.q)
})

// following for search
let query = $ref(''), result = $ref([])

const computeResult = debounce(() => {
  if (!query || query.length < 2) return result = []
  const res = new Set(), qu = query.toUpperCase()
  for (const k in locations) {
    if (k.toUpperCase().indexOf(qu) === 0) res.add(k)
  }
  for (const k in classrooms) {
    if (k.indexOf(qu) === 0) res.add(k)
  }
  if (qu.length < 3) return result = [...res]
  for (const k in locations) {
    if (k.toUpperCase().indexOf(qu) > 0) res.add(k)
  }
  for (const k in classrooms) {
    if (k.indexOf(qu) > 0) res.add(k)
  }
  result = [...res]
})

function focus (r) {
  query = r
  result = []
  const pos = ll(locations[r] || classrooms[r])
  markerFeature.setGeometry(new Point(pos))
  setTimeout(() => {
    view.animate({ center: pos, zoom: classrooms[r] ? 18 : 17 })
  })
}

function clear () {
  query = ''
  markerFeature.setGeometry(null)
  computeResult()
}

onActivated(() => {
  if (map && route.query.q) focus(route.query.q)
})
</script>

<template>
  <div class="w-full h-full flex flex-col relative items-end">
    <div ref="el" class="w-full h-full absolute"></div>
    <div class="absolute top-3 mr-3 w-96 bg-white shadow-md rounded" style="max-width: 80%;">
      <input v-model="query" @input="computeResult" placeholder="Search locations & classrooms!" class="px-3 py-1.5 w-full rounded font-bold">
      <XMarkIcon v-if="query" @click="clear" class="w-5 text-gray-500 absolute cursor-pointer right-2 top-2 bg-white" />
      <hr v-if="result.length" class="w-full">
      <Wrapper :show="result.length" class="h-60 overflow-y-auto px-2 text-gray-500 text-sm">
        <div v-for="r in result" @click="focus(r)" class="cursor-pointer py-1">{{ r }}</div>
      </Wrapper>
    </div>
  </div>
</template>

<style>
.center-control {
  top: 65px;
  left: .5em;
}
.ol-touch .center-control {
  top: 80px;
}
</style>
