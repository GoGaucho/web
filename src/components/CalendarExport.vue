<script setup>
import { computed, nextTick, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { getAuth } from 'firebase/auth'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import state from '../model.js'
import { quarter as quarterName } from '../utils/parse.js'
import { createCalendar, isTimedPiece, normalizeClassDate, sessionDateRange } from '../utils/calendar.js'
import { getAcademicCalendar } from '../utils/academic-calendar.js'
import { prepareGoogleCalendar, authorizeGoogleCalendar, googleCalendarErrorMessage } from '../utils/google-calendar-auth.js'
import { createGoogleCalendar, googleCalendarUrl } from '../utils/google-calendar.js'

const props = defineProps({
  pieces: { type: Array, required: true },
  quarter: { type: String, default: '' },
  disabled: Boolean,
  googleUserId: { type: String, default: '' },
  googleUserEmail: { type: String, default: '' }
})

const dialog = ref(null)
const dialogHeading = ref(null), googleSubmit = ref(null)
const startDate = ref(''), endDate = ref(''), sessionRanges = ref({})
const noClassDates = ref([])
const loadingDates = ref(false), status = ref('')
const busy = ref(false), cancelling = ref(false)
const loadingGoogle = ref(false), googleReady = ref(false), googleSetupError = ref('')
const googleAdded = ref(false), googleError = ref(''), googleUrl = ref('')
const importSnapshot = ref(null)
const recovery = computed({
  get: () => state.calendarImportRecoveries[props.googleUserId] || null,
  set: value => {
    if (value) state.calendarImportRecoveries[value.userId] = value
    else delete state.calendarImportRecoveries[props.googleUserId]
  }
})
const id = 'calendar-export-' + Math.random().toString(36).slice(2)
let request = 0
let operation = 0, activeOperation = null

const calendarName = computed(() => 'UCSB Schedule Calendar ' + (props.quarter ? quarterName(props.quarter) : ''))
const hasRecovery = computed(() => recovery.value?.userId === props.googleUserId && Boolean(props.googleUserId))
const timedPieces = computed(() => props.pieces.filter(isTimedPiece))
const sessions = computed(() => [...new Set(timedPieces.value.map(p => p.session).filter(Boolean))])
const hasDates = computed(() => startDate.value && endDate.value && sessions.value.every(s => sessionRanges.value[s]?.startDate && sessionRanges.value[s]?.endDate))
const result = computed(() => {
  if (!hasDates.value) return { error: '' }
  try {
    return createCalendar({
      quarter: props.quarter, pieces: props.pieces,
      startDate: startDate.value, endDate: endDate.value,
      sessionRanges: sessionRanges.value, noClassDates: noClassDates.value
    })
  } catch (error) {
    return { error: error.message }
  }
})
const canAddGoogle = computed(() => !props.disabled && !busy.value && !loadingDates.value &&
  !loadingGoogle.value && googleReady.value && !googleAdded.value && !hasRecovery.value &&
  Boolean(props.googleUserId) && Boolean(result.value.events?.length))

async function open () {
  if (busy.value) return
  status.value = ''
  googleError.value = ''
  googleSetupError.value = ''
  googleReady.value = false
  googleAdded.value = false
  googleUrl.value = ''
  importSnapshot.value = null
  startDate.value = ''
  endDate.value = ''
  noClassDates.value = []
  sessionRanges.value = Object.fromEntries(sessions.value.map(s => [s, sessionDateRange(s, props.quarter)]))
  const currentRequest = ++request
  loadingDates.value = true
  loadingGoogle.value = true
  dialog.value.showModal()
  dialogHeading.value.focus()
  await Promise.all([loadDates(currentRequest), prepareConnection(currentRequest)])
}

async function loadDates (currentRequest) {
  try {
    const dates = getAcademicCalendar(props.quarter)
    if (currentRequest !== request || !dialog.value.open) return
    if (dates) {
      startDate.value = normalizeClassDate(dates.startDate)
      endDate.value = normalizeClassDate(dates.endDate)
      noClassDates.value = [...dates.noClassDates]
    }
  } catch {
    // Adding stays unavailable without verified class dates and no-class dates.
    startDate.value = ''
    endDate.value = ''
  } finally {
    if (currentRequest === request) loadingDates.value = false
  }
}

async function prepareConnection (currentRequest) {
  if (currentRequest !== request || !dialog.value?.open) return
  loadingGoogle.value = true
  googleReady.value = false
  try {
    await prepareGoogleCalendar()
    if (currentRequest !== request || !dialog.value?.open) return
    googleSetupError.value = ''
    googleReady.value = true
  } catch (error) {
    if (currentRequest === request && dialog.value?.open) googleSetupError.value = googleCalendarErrorMessage(error)
  } finally {
    if (currentRequest === request) loadingGoogle.value = false
  }
}

async function retryConnection () {
  const currentRequest = request
  await prepareConnection(currentRequest)
  if (currentRequest === request && dialog.value?.open && googleReady.value) {
    await nextTick()
    if (currentRequest === request && dialog.value?.open) {
      if (canAddGoogle.value) googleSubmit.value?.focus()
      else dialogHeading.value?.focus()
    }
  }
}

function finishClose () {
  request++
  loadingDates.value = false
  loadingGoogle.value = false
  dialog.value?.close()
}

function close () {
  const pending = activeOperation
  if (!busy.value || !pending) return finishClose()
  pending.canceled = true
  if (pending.phase === 'authorizing') {
    activeOperation = null
    busy.value = false
    cancelling.value = false
    pending.controller.abort()
    finishClose()
    return
  }
  cancelling.value = true
  pending.closeWhenDone = true
  status.value = 'Cancelling…'
}

watch(() => [props.quarter, props.disabled, props.googleUserId], () => {
  close()
  if (importSnapshot.value?.userId !== props.googleUserId) finishClose()
})
function leave () {
  close()
  finishClose()
}
onDeactivated(leave)
onBeforeUnmount(leave)

async function addToGoogle () {
  if (!canAddGoogle.value) return
  const snapshot = {
    userId: props.googleUserId, email: '', quarter: props.quarter,
    name: calendarName.value, events: JSON.parse(JSON.stringify(result.value.events))
  }
  const pending = {
    id: ++operation, phase: 'authorizing', controller: new AbortController(),
    canceled: false, closeWhenDone: false
  }
  activeOperation = pending
  const isCurrent = () => activeOperation?.id === pending.id && !pending.canceled && !props.disabled &&
    props.googleUserId === snapshot.userId && props.quarter === snapshot.quarter &&
    getAuth().currentUser?.uid === snapshot.userId
  importSnapshot.value = snapshot
  busy.value = true
  cancelling.value = false
  googleError.value = ''
  status.value = 'Connecting to Google…'
  try {
    const authorization = await authorizeGoogleCalendar(snapshot.userId, { signal: pending.controller.signal })
    if (!isCurrent()) return
    snapshot.email = authorization.email
    importSnapshot.value = { ...snapshot }
    pending.phase = 'writing'
    const calendar = await createGoogleCalendar({
      accessToken: authorization.accessToken, name: snapshot.name, events: snapshot.events, isCurrent,
      onProgress: (added, total) => {
        if (isCurrent()) status.value = `Adding your classes… ${added} of ${total}`
      }
    })
    if (!isCurrent()) {
      recovery.value = {
        userId: snapshot.userId, email: snapshot.email,
        message: `“${snapshot.name}” was created. Check Google Calendar before adding another copy.`,
        url: googleCalendarUrl(calendar.calendarId, snapshot.email)
      }
      return
    }
    googleAdded.value = true
    googleUrl.value = googleCalendarUrl(calendar.calendarId, snapshot.email)
    status.value = `“${snapshot.name}” is ready. You can edit it in Google Calendar.`
    busy.value = false
    if (isCurrent()) window.location.assign(googleUrl.value)
  } catch (error) {
    if (activeOperation === pending && !pending.closeWhenDone) status.value = ''
    if (error.partial || error.uncertain) {
      recovery.value = {
        userId: snapshot.userId, message: googleCalendarErrorMessage(error),
        email: snapshot.email,
        url: googleCalendarUrl(error.calendarId || '', snapshot.email)
      }
    }
    if (activeOperation === pending && !pending.canceled && !error.canceled && props.googleUserId === snapshot.userId) googleError.value = googleCalendarErrorMessage(error)
  } finally {
    if (activeOperation === pending) {
      activeOperation = null
      busy.value = false
      cancelling.value = false
      if (pending.closeWhenDone) finishClose()
    }
  }
}

function clearRecovery () {
  recovery.value = null
  googleError.value = ''
}
</script>

<template>
  <button v-if="googleUserId" type="button" class="inline-flex min-h-11 items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    :disabled="disabled || busy || !googleUserId || !quarter || !timedPieces.length" @click="open">
    <CalendarDaysIcon class="mr-2 h-4 w-4" aria-hidden="true" />Add to Google Calendar
  </button>
  <Teleport to="body">
    <dialog ref="dialog" :aria-labelledby="id + '-title'" :aria-describedby="id + '-help'" class="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6" @cancel.prevent="close">
      <form @submit.prevent="addToGoogle">
        <h2 ref="dialogHeading" tabindex="-1" :id="id + '-title'" class="text-xl font-bold">{{ importSnapshot?.name || calendarName }}</h2>
        <p :id="id + '-help'" class="mt-2 text-sm text-gray-600">
          Choose your personal or school Google account.
        </p>
        <p v-if="importSnapshot?.email" class="mt-2 text-sm text-gray-600">Google account: <b>{{ importSnapshot.email }}</b></p>
        <p v-if="loadingDates || loadingGoogle" class="mt-3 text-sm text-gray-500" role="status">Preparing your calendar…</p>
        <p v-else-if="!hasDates || result.error" :id="id + '-error'" class="mt-3 text-sm text-red-700" role="alert">This quarter’s calendar isn’t ready yet. Please try again later.</p>
        <div v-if="hasRecovery" class="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          <p>{{ recovery.message }}</p>
          <a :href="recovery.url" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block underline focus-visible:ring-2 focus-visible:ring-blue-500">Open Google Calendar</a>
          <button type="button" :disabled="busy" class="ml-3 mt-2 underline focus-visible:ring-2 focus-visible:ring-blue-500" @click="clearRecovery">I’ve checked my calendar</button>
        </div>
        <div v-else-if="googleSetupError" class="mt-3 text-sm text-red-700" role="alert">
          <p>{{ googleSetupError }}</p>
          <button type="button" :disabled="loadingGoogle || busy" class="mt-1 min-h-11 text-blue-700 underline disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500" @click="retryConnection">{{ loadingGoogle ? 'Connecting…' : 'Try connecting again' }}</button>
        </div>
        <p v-else-if="googleError" class="mt-3 text-sm text-red-700" role="alert">{{ googleError }}</p>
        <p class="mt-2 text-sm text-green-800" role="status">{{ status }}</p>
        <a v-if="googleAdded && googleUrl && importSnapshot?.userId === googleUserId" :href="googleUrl" class="mt-2 inline-block text-blue-700 underline focus-visible:ring-2 focus-visible:ring-blue-500">Open Google Calendar</a>
        <div class="mt-4 flex flex-wrap justify-end gap-3">
          <button type="button" :disabled="cancelling" class="min-h-11 rounded-full border px-4 py-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500" @click="close">{{ cancelling ? 'Cancelling…' : busy ? 'Cancel' : 'Close' }}</button>
          <button ref="googleSubmit" type="submit" :disabled="!canAddGoogle" class="min-h-11 rounded-full bg-blue-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">{{ busy ? 'Adding…' : googleAdded ? 'Added' : 'Add to Google Calendar' }}</button>
        </div>
        <p class="mt-4 text-xs text-gray-600">This creates a separate calendar you can edit, then opens Google Calendar. Later schedule changes won’t sync. Adding again creates another calendar. Your edits don’t change your enrollment. Classes skip official no-class dates; custom events are kept. Final exams aren’t included yet.</p>
      </form>
    </dialog>
  </Teleport>
</template>

<style scoped>
dialog::backdrop {
  background: rgb(0 0 0 / 40%);
}
</style>
