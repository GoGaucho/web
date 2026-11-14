<script setup>
import { computed, ref } from 'vue'
import { log } from '../firebase.js'
import links, { studentServices } from '../utils/links.js'
import { categories, filterContacts } from '../utils/contacts.js'
import LinkCard from '../components/LinkCard.vue'
import ContactCard from '../components/ContactCard.vue'

// App.vue's KeepAlive retains this selection and directory filters on return.
const tabs = [
  { id: 'campus-links', label: 'Campus Links' },
  { id: 'student-services', label: 'Phone Directory' }
]
const selectedTab = ref('campus-links')
const query = ref('')
const category = ref('')
const services = studentServices
const categoryColors = {
  'Campus Safety': 'border-red-300',
  'Health & Wellness': 'border-green-300',
  'Technology Support': 'border-blue-300',
  'Academic & Financial Support': 'border-purple-300',
  'Campus Services': 'border-amber-300'
}
const results = computed(() => filterContacts(services, query.value, category.value))
const groups = computed(() => categories.map(name => ({ name, services: results.value.filter(service => service.category === name) })).filter(group => group.services.length))
const campusLinks = links

function resetFilters() {
  query.value = ''
  category.value = ''
}

function handleTabKeydown(event, index) {
  const nextIndex = {
    ArrowRight: (index + 1) % tabs.length,
    ArrowLeft: (index - 1 + tabs.length) % tabs.length,
    Home: 0,
    End: tabs.length - 1
  }[event.key]
  if (nextIndex === undefined) return
  event.preventDefault()
  selectedTab.value = tabs[nextIndex].id
  event.currentTarget.parentElement.querySelectorAll('[role=tab]')[nextIndex].focus()
}
log('web/link')
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Links and Phone Numbers</h1>
    <p class="text-sm text-gray-500">Campus links and useful phone numbers.</p>
    <div role="tablist" aria-label="Campus resources" class="my-4 flex gap-4 border-b">
      <button v-for="(tab, index) in tabs" :id="`${tab.id}-tab`" :key="tab.id" type="button" role="tab" :aria-selected="selectedTab === tab.id" :aria-controls="tab.id" :tabindex="selectedTab === tab.id ? 0 : -1" class="border-b-2 px-1 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-500" :class="selectedTab === tab.id ? 'border-blue-500 font-bold text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'" @click="selectedTab = tab.id" @keydown="handleTabKeydown($event, index)">{{ tab.label }}</button>
    </div>

    <section id="campus-links" v-show="selectedTab === 'campus-links'" role="tabpanel" aria-labelledby="campus-links-tab" tabindex="0" class="focus-visible:ring-2 focus-visible:ring-blue-500">
      <template v-for="(group, index) in campusLinks" :key="index">
        <hr>
        <div class="my-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1 sm:gap-3">
          <LinkCard v-for="link in group" :key="link.href" :title="link.title" :description="link.description" :icon="link.icon" :href="link.href" :phone="link.phone" />
        </div>
      </template>
    </section>

    <section id="student-services" v-show="selectedTab === 'student-services'" role="tabpanel" aria-labelledby="student-services-tab" tabindex="0" class="max-w-4xl focus-visible:ring-2 focus-visible:ring-blue-500">
      <h2 class="sr-only">Student Services Phone Directory</h2>

      <div class="my-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <label for="service-search" class="min-w-0 flex-1 text-sm font-bold">
          Search
          <input id="service-search" v-model="query" type="search" placeholder="Service or phone number" class="mt-1 block w-full rounded border bg-white px-2 py-1 text-base font-normal focus-visible:ring-2 focus-visible:ring-blue-500" aria-describedby="search-help">
        </label>
        <label for="service-category" class="min-w-0 text-sm font-bold sm:w-64">
          Category
          <select id="service-category" v-model="category" class="mt-1 block w-full rounded border bg-white px-2 py-1 text-base font-normal focus-visible:ring-2 focus-visible:ring-blue-500">
            <option value="">All services</option>
            <option v-for="name in categories" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
      </div>
      <p id="search-help" class="text-xs text-gray-500">Search by name, description, category, or number.</p>
      <div class="my-2 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
        <p role="status" aria-live="polite" aria-atomic="true">{{ results.length }} {{ results.length === 1 ? 'service' : 'services' }} found<span v-if="category"> in {{ category }}</span></p>
        <button v-if="query || category" type="button" class="rounded py-2 text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500" @click="resetFilters">Clear search and filters</button>
      </div>
      <div v-if="!results.length" class="border-t py-4 text-sm">
        <h3 class="font-bold">No services found</h3>
        <p class="mt-1 text-gray-500">Try another service name, phone number, or category.</p>
        <button type="button" class="mt-1 rounded py-2 text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500" @click="resetFilters">Show all services</button>
      </div>
      <section v-for="group in groups" :key="group.name" class="mb-4" :aria-label="group.name">
        <h3 class="my-2 border-l-4 pl-2 text-sm font-bold text-gray-900" :class="categoryColors[group.name]">{{ group.name }}</h3>
        <div class="rounded border border-b-0 bg-white">
          <ContactCard v-for="service in group.services" :key="service.id" :service="service" />
        </div>
      </section>
      <p class="my-3 text-xs text-gray-500">Numbers verified with UCSB on October 31, 2026.</p>
    </section>
  </div>
</template>
