<script setup>
import { onActivated } from 'vue'
import { ArrowPathIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { call, db, log, get } from '../firebase.js'
import { state, cache } from '../model.js'
import { onSnapshot, setDoc, doc } from 'firebase/firestore'
import * as parse from '../utils/parse.js'
import Schedule from '../components/Schedule.vue'
import Registration from '../components/Registration.vue'
import { signInWithPopup, getAuth, GoogleAuthProvider } from "firebase/auth"
import { gapi } from "gapi-script"

let q = $ref(''), qs = $ref([]), data = $ref({}), custom = $ref([]), syncedEvents = []
log('web/class')

const pieces = $computed(() => {
  const res = []
  if (!data.schedule) return res
  for (const k in data.schedule) {
    const ss = data.schedule[k].session?.substring(5).trim()
    for (const p of data.schedule[k].periods) {
      for (const w of p.wTime) res.push({
        wTime: w, key: k,
        time: p.time.replace(/^(.*?)\s/, ''),
        location: p.location,
        label: ss ? ['Session ' + ss] : []
      })
    }
  }

  // if(custom.length === 0) return res
  for (const c of custom) {
    for (const w of c.wTime) res.push({
      wTime: w, key: 'custom',
      time: c.time.replace(/^(.*?)\s/, ''),
      title: c.title,
      location: c.location,
      label: ['Custom']
    })
  }

  return res
})

// fetch data from server, and write result to local cache
async function fetchData () {
  cache.set('class' + q, false)

  const token = cache.get('token')
  if (!token) return window.signin('Please verify your identity')
  data = {}
  state.loading = true
  const raw = await call('student', { q, token })
  state.loading = false
  if (!raw) return
  data = raw
  qs = data.quarters

  cache.set('class' + q, raw, 86400e6)
}

let unsub = null
function fetchCustom(){
  // fetch customize schedule
  cache.set('custom' + q, false)

  if(unsub) unsub()

  custom = []
  unsub = onSnapshot(doc(db, `user/${state.user.uid}/schedule/${q}`), doc => {
    const c = doc.data()
    if (!c) return
    custom = JSON.parse(c['+'])
    cache.set('custom' + q, custom, 86400e6)
  })
}

let listener = null
async function fetchSyncedEvents(){
  cache.set("syncedEvents", false)
  if(listener) listener()

  syncedEvents = []
  listener = onSnapshot(doc(db, `user/${state.user.uid}/schedule/${q}`), doc => {
    const s = doc.data()
    if (!s) return
    syncedEvents = JSON.parse(s['syncedEvents'])
    cache.set("syncedEvents", syncedEvents, 86400e6)
  })
}

function getData () {

  custom = cache.get('custom' + q)

  if (!custom || custom.length === 0) {
    custom = []
    fetchCustom()
  }

  data = cache.get('class' + q)

  if (!data) {
    data = {}
    fetchData()
  }else{
    qs = data.quarters
  }

  syncedEvents = cache.get("syncedEvents")
  if (!syncedEvents) {
    syncedEvents = []
    fetchSyncedEvents()
  }
}

window.onsignin = getData

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function init () {
  if (!state.quarter) {
    state.quarter = (await get('cache/quarter')).current
  }
  q = state.quarter
  //initialize qs
  qs = [parse.quarterLast(q), q, parse.quarterNext(q)]
  await sleep(500)
  if (state.user.uid) getData()
  else window.signin('Please verify your identity')
}

onActivated(init)

// following are about customize schedule
const wTime = (d, hr, min) => d * 1440 + hr * 60 + Number(min)
const days = 'MTWRFSU'
let edit = $ref({})
let ready = $computed(() => {
  if (!edit.title || !edit.time) return false
  const m = edit.time.toUpperCase().match(/^([MTWRFSU ]+)\s*(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/)
  if (!m || m[2] > 23 || m[4] > 23 || m[3] > 59 || m[5] > 59 || wTime(0, m[2], m[3]) >= wTime(0, m[4], m[5])) return false
  const ws = []
  let ds = ''
  for (let d = 0; d < 7; d++) {
    if (!m[1].includes(days[d])) continue
    ds += days[d]
    ws.push([wTime(d, m[2], m[3]), wTime(d, m[4], m[5])])
  }
  if (!ws.length) return false
  return [ws, `${ds} ${m[2]}:${m[3]} - ${m[4]}:${m[5]}`]
})

function submitCustom () {
  setDoc(doc(db, `user/${state.user.uid}/schedule/${q}`), {
    '+': JSON.stringify(custom)
  }, { merge: true })
  //updat the cache data for custom event
  cache.set('custom' + q, custom, 86400e6)
}

function addCustom () {
  if (!ready) return
  custom.push({
    title: edit.title,
    location: edit.location,
    wTime: ready[0],
    time: ready[1]
  })
  submitCustom()
  edit = {}
}

function removeCustom (i) {
  custom.splice(i, 1)
  submitCustom()
}

async function signInWithGoogle(){
  const auth = getAuth();
  const provider = new GoogleAuthProvider()
  provider.addScope("https://www.googleapis.com/auth/calendar.events");

  try{
    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)

    // cache.set("googleToken", credential.accessToken, 86400e6)
    console.log("Google login success")
    alert("Successfully signed in with Google.")
    return credential.accessToken
  }catch(error){
    console.error("Google login error: ", error)
    alert("Failed to sign in with Google. Please try again later.")
    return null
  }
}

function getWeekStartDates(start, end){
  const weeks = []
  const current = new Date(start)
  while (current <= end){
    weeks.push(current.toISOString())
    current.setDate(current.getDate() + 7)
  }
  return weeks
}

function getDateTime(weekStart, start, duration){
  const date = new Date(weekStart)
  const dayOffset = Math.floor(start / 1440)
  const startTime = start % 1440
  const startHour = Math.floor(startTime / 60)
  const startMinute = startTime % 60

  date.setDate(date.getDate() + dayOffset)
  date.setHours(startHour, startMinute, 0, 0)

  const endDate = new Date(date)
  endDate.setMinutes(endDate.getMinutes() + duration)

  return {start: date.toISOString(), end: endDate.toISOString()}
}

function filterEvents(previousEvents, currentEvents){
  if (!previousEvents) return { toBeAdded: currentEvents, toBeRemoved: [] }
  if (!currentEvents) return { toBeAdded: [], toBeRemoved: previousEvents }
  const eventExists = (event, events) => events.some(
    (e) => 
      e.summary === event.summary && 
      e.location === event.location && 
      e.start.dateTime === event.start.dateTime && 
      e.end.dateTime === event.end.dateTime
  )

  const toBeAdded = currentEvents.filter(
    (event) => !eventExists(event, previousEvents)
  )

  const toBeRemoved = previousEvents.filter( 
    (event) => !eventExists(event, currentEvents)
  ) 

  return { toBeAdded, toBeRemoved }
}

async function deleteEventsGoogleCalendar(toBeRemoved){
  // gapi setup
  // Have to make sure a valid token is stored in cache before calling this function
  await new Promise((resolve, reject) => {
    gapi.load("client:auth2", resolve);
  });
  await gapi.client.init({
    apiKey: "AIzaSyC7WZFIjRUQ01A-SCVs0V_bNdhC8YCPzoI",
    clientId: "1:1083649636208:web:690b97b048d194077241b5",
    discoveryDocs: [
      "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
    ],
    scope: "https://www.googleapis.com/auth/calendar.events",
  });
  gapi.auth.setToken({ access_token: cache.get("googleCalendarToken") })

  // due to the Google Calendar's quota limit, parallel requests are not allowed
  // await Promise.all(
  //   toBeRemoved.map(async (event) => {
  //     try{
  //       await gapi.client.calendar.events.delete({
  //         calendarId: "primary",
  //         eventId: event.id,
  //       })
  //       console.log(`Event deleted: ${event.summary}`)
  //     }catch(error){
  //       console.error(`Failed to delete event: ${error.message}`)
  //     } 
  //   })
  // )

  for (let event of toBeRemoved) {
    try {
      await gapi.client.calendar.events.delete({
        calendarId: "primary",
        eventId: event.id,
      })  
      console.log(`Event deleted: ${event.summary}`)
    } catch (error) {
      console.error(`Failed to delete event: ${error.message}`)
    }
  }
}

async function submitSyncedEvents(toBeAdded, toBeRemoved){
  const updatedSyncedEvents = syncedEvents.concat(toBeAdded).filter(event => !toBeRemoved.some(e => e.id === event.id))
  setDoc(doc(db, `user/${state.user.uid}/schedule/${q}`), { "syncedEvents":  
    JSON.stringify(updatedSyncedEvents)
  }, { merge: true })
  cache.set("syncedEvents", updatedSyncedEvents);
}

async function syncToGoogleCalendar(){
  console.log("local cache: ", cache.get("syncedEvents"))

  // fetch current quarter data
  const stat = (await getDoc(doc(db, "cache", "quarter"))).data()
  let quarterStart = new Date(stat.currentBeginClasses)
  let quarterEnd= new Date(stat.currentEndClasses)
  let currentQuarter = stat.current

  if (q != currentQuarter) {
    alert("You can only synchronize to Google Calendar for the current quarter. To do so please switch to the current quarter in the dropdown widget to the right of **My Classes**")
    return 
  }

  // check if user has already exported to Google Calendar for the current quarter
  if (cache.get("syncedEvents").length !== 0){
    const confirmation = confirm("You have already exported to Google Calendar for this quarter. Are you sure you want to do it again?")
    if (!confirmation){
      alert("Export cancelled.")
      return
    }
  }

  // confirm export to Google Calendar
  const confirmation = confirm(
      "This feature will synchronize your current schedule from GoGaucho to Google Calendar " +
      "for **all TEN weeks** in the **CURRENT** quarter. It will include both verified events " +
      "from GOLD and custom events. While you can choose which account to export to, it " +
      "is recommended to stick to the **DEFAULT** account ending with @ucsb.edu. Currently we only " + 
      "support exporting to one google account. Due to the Google Calendar's quota limit, this " +
      "process maytake around a minute or two. You will be noticed by **Successfully synchronized " +
      "to Google Calendar.** as soon as the process is complete.\n\n" + 
      "Click OK to proceed or Cancel to abort."
  )
  if (!confirmation){
    alert("Export cancelled.")  
    return
  }

  try{
    // Load the Google API client library
    await new Promise((resolve, reject) => {
      gapi.load("client:auth2", resolve);
    });

    // Initialize the Google API client
    await gapi.client.init({
      apiKey: "AIzaSyC7WZFIjRUQ01A-SCVs0V_bNdhC8YCPzoI",
      clientId: "1:1083649636208:web:690b97b048d194077241b5",
      discoveryDocs: [
        "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
      ],
      scope: "https://www.googleapis.com/auth/calendar.events",
    });
    console.log("GAPI client initialized");

    // fetch user's access token 
    const token = await signInWithGoogle()
    if(!token){
      alert("Invalid Token")
      throw new Error("Invalid Token")
    }
    gapi.auth.setToken({ access_token: token })
    cache.set("googleCalendarToken", token)
  
    // Calculate the start and end dates of the current quarter
    let startOFWeeks = getWeekStartDates(quarterStart, quarterEnd)

    // Create events for each verified course on GOLD for each week in a quarter
    let events = []
    let schedule = data.schedule
    console.log("Schedule: ", schedule)
    for (const weekStart of startOFWeeks){
      for (const courseKey in schedule){
      const course = schedule[courseKey]
      const periods = course.periods
        for (const period of periods){
          for (const time of period.wTime){
            const [startMinutes, endMinutes] = time
            const { start, end } = getDateTime(weekStart, startMinutes, endMinutes - startMinutes)
            const event = {
              summary: course.title,
              location: period.location,
              description: `Instructors: ${period.instructors.join(', ')}\nInstruction Type: ${period.instructionTypeCode}`,
              start: { dateTime: start, timeZone: "America/Los_Angeles" },
              end: { dateTime: end, timeZone: "America/Los_Angeles" }
            }
            events.push(event)
          }
        }
      }
    }

    // Create events for each custom event for each week in a quarter
    for (const weekStart of startOFWeeks){
      for (const customEvent of custom){
        for (const time of customEvent.wTime){
          const [startTime, endTime] = time
          const { start, end } = getDateTime(weekStart, startTime, endTime - startTime)
          const event = {
            summary: customEvent.title,
            location: customEvent.location,
            description: "null",
            start: { dateTime: start, timeZone: "America/Los_Angeles" },
            end: { dateTime: end, timeZone: "America/Los_Angeles" }
          }
          events.push(event)
        }
      }
    }

    // Sync events to Google Calendar
    console.log("events: ", events)
    const { toBeAdded, toBeRemoved } = filterEvents(cache.get("syncedEvents"), events)
    console.log("toBeAdded: ", toBeAdded)
    console.log("toBeRemoved: ", toBeRemoved)

    // due to the Google Calendar's quota limit, parallel requests are not allowed
    // await Promise.all(
    //   toBeAdded.map(async (event) => {
    //     try{
    //       const response = await gapi.client.calendar.events.insert({
    //         calendarId: "primary",
    //         resource: event,
    //       });
    //       event.id = response.result.id
    //       console.log(`Event created: ${response.result.htmlLink}`);
    //     }catch(error){
    //       console.error(`Failed to create event: ${event.summary}`, error);
    //     } 
    //   })
    // )
    
    for (let event of events) {
      try {
        const response = await gapi.client.calendar.events.insert({
          calendarId: "primary",
          resource: event,
        });
        event.id = response.result.id;
        console.log(`Event created: ${response.result.htmlLink}`);
      } catch (error) {
        console.error(`Failed to create event: ${event.summary}`, error);
      }
    }
    deleteEventsGoogleCalendar(toBeRemoved)
    
    submitSyncedEvents(toBeAdded, toBeRemoved)
    console.log(cache.get("syncedEvents"))
    alert("Successfully synchronized to Google Calendar.")
  }catch(error){
    console.error("Google Calendar API error: ", error)
    alert("Failed to export to Google Calendar. Please try again later.")
  }
}

async function undoSync(){
  console.log("local cache: ", cache.get("syncedEvents"))
  if (cache.get("syncedEvents").length == 0){
    alert("No export to undo.")
    return
  }
  const confirmation = confirm(
    "This will remove all changes synchronized to your Google Calendar. Click OK to proceed or Cancel "+
    "to abort. If you choose to proceed, you will be notified by **Successfully undid synchronization** "+
    "when the process is complete."
  )
  if (!confirmation){
    alert("Undo cancelled.")
    return
  }
  if (cache.get("googleCalendarToken") == null){
    const token = await signInWithGoogle()
    if(!token){
      alert("Invalid Token")
      throw new Error("Invalid Token")
    }
    gapi.auth.setToken({ access_token: token })
    cache.set("googleCalendarToken", token)
  }
  deleteEventsGoogleCalendar(cache.get("syncedEvents"))
  submitSyncedEvents([], cache.get("syncedEvents"))
  alert("Successfully undid synchronization.")
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center w-full p-4 pb-2 sm:px-10">
      <div class="flex items-center">
        <h1 class="text-2xl">My Classes</h1>
        <select class="ml-3 px-2 py-1 rounded appearance-none text-sm block shadow bg-white cursor-pointer" v-model="q" @change="getData">
          <option v-for="o in qs" :value="o">{{ parse.quarter(o) }}</option>
        </select>
      </div>
      <div class="flex items-center space-x-2">
        <button 
          class="bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600 transition" @click="undoSync">
          Undo Sync
        </button>
        <button 
          class="bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600 transition" @click="syncToGoogleCalendar">
          Sync to Google Calendar
        </button>
        <ArrowPathIcon class="w-6 text-gray-500 cursor-pointer" @click="fetchData" />
      </div>
    </div>
    <div class="w-full flex flex-wrap justify-center items-start" v-if="data" :key="q">
      <div class="flex-grow bg-white sm:p-2 sm:pb-4 lg:px-6 pb-4 rounded shadow m-0 sm:m-4 lg:mr-0" v-if="data.schedule"><!-- schedule -->
        <Schedule :pieces="pieces" whole="1" />
      </div>
      <div class="m-2 w-full lg:w-72 xl:w-80"><!-- side -->
        <div :show="1" v-if="data.schedule" class="p-2">
          <div class="rounded shadow-md bg-white overflow-hidden">
            <div class="text-white font-bold p-2 bg-green-800">Customize Schedule</div>
            <div class="px-2">
              <div class="m-2 flex items-center flex-wrap" v-for="(c, i) in custom">
                <b>{{ c.title }}</b>
                <span class="text-xs text-gray-500 mx-2">{{ c.time }}</span>
                <XCircleIcon class="w-5 text-red-500 cursor-pointer" @click="removeCustom(i)"/>
              </div>
            </div>
            <div class="flex flex-wrap items-center m-2 mb-0">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="Title" v-model="edit.title">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="Location" v-model="edit.location">
              <input class="rounded border bg-transparent appearance-none m-1 px-1" placeholder="MTWRFSU 08:00 - 23:59" v-model="edit.time">
            </div>
            <p class="text-xs text-gray-500 mx-4">Time format: 24-hour hh:mm</p>
            <button class="all-transition rounded shadow text-white font-bold m-4 mt-2 px-2 py-1" :class="ready ? 'bg-blue-500 hover:shadow-md' : 'bg-gray-300'" @click="addCustom">Add Event</button>
          </div>
        </div>
        <Registration v-if="data.registration" :data="data.registration"/>
      </div>
    </div>
    <p class="m-4" v-else>No data</p>
  </div>
</template>

<style scoped>
code {
  @apply bg-white font-normal;
}
</style>