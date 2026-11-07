<script setup>
import { log } from '../firebase.js'
import { CreditCardIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import WeeklyMenu from '../components/WeeklyMenu.vue'
log('web/dining')

const dcs = {
  'de-la-guerra': 'De La Guerra',
  'portola': 'Portola',
  'carrillo': 'Carrillo',
  'ortega': 'Ortega'
}
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Dining Commons</h1>
    <WeeklyMenu :dining-commons="dcs">
      <template #actions>
        <div class="flex gap-6">
          <div class="flex items-center flex-wrap">
            <a class="cursor-pointer my-1 px-3 py-1 text-sm sm:text-base sm:px-4 sm:py-2 rounded-full border font-bold text-blue-500 bg-white flex items-center all-transition hover:shadow" href="https://ucsb-sp.transactcampus.com/eaccounts/AccountSummary.aspx?menu=0"><CreditCardIcon class="w-5 mr-1" />Check Meal Plan</a>
          </div>
          <div class="flex items-center flex-wrap ml-auto">
            <a class="cursor-pointer my-1 px-3 py-1 text-sm sm:text-base sm:px-4 sm:py-2 rounded-full border font-bold text-blue-500 bg-white flex items-center all-transition hover:shadow" href="https://nutrition.info.dining.ucsb.edu/NetNutrition/1"><InformationCircleIcon class="w-5 mr-1" />Nutrition Facts</a>
          </div>
        </div>
      </template>
    </WeeklyMenu>
  </div>
</template>
