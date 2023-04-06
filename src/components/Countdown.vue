<script setup>
import { onActivated, watch } from 'vue'
import { state, cache } from '../model.js'
import { classrooms } from '../utils/locations.js'
import { MapPinIcon, AcademicCapIcon } from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'

const router = useRouter()
let classes = $ref(false)
let progress = $ref({
  percent: 0,
})
let currClass = $ref(false)

let currTime = $ref({
  hour: (new Date()).getHours(),
  minute: (new Date()).getMinutes(),
  day: (new Date()).getDay(),
  second: (new Date()).getSeconds(),
  nextEventTime: -1
});

function getClasses() {
  const schedule = cache.get('class' + state.quarter)?.schedule
  if (!schedule) return classes = false
  classes = []
  const day = (new Date()).getDay()
  for (const c in schedule) {
    const session = schedule[c].session?.substring(5).trim()
    const periods = schedule[c].periods
    for (const p of periods) {
      for (const w of p.wTime) {
        if (w[0] < (day - 1) * 1440 || w[1] > day * 1440) continue
        classes.push({
          course: c, session,
          location: p.location,
          //time in the week (in minutes)
          wTime: w,
          time: p.time.replace(/^(.*?)\s/, '')
        })
      }
    }
  }
  // }
  //  classes = [{course:"MAT201",session:"1",location:"B1",wTime:[2820,2830],time:"8:00-9:30"},
  // {course:"MAT202",session:"1",location:"B1",wTime:[4211,4299],time:"8:00-9:30"},
  // {course:"MAT203",session:"1",location:"B1",wTime:[4340,4340],time:"8:00-9:30"}]
  //classes = [{course:"MAT201",session:"1",location:"B1",wTime:[2820,2830],time:"8:00-9:30"}]
  //classes = []
  classes.sort((a, b) => a.wTime[0] - b.wTime[0])
}

getClasses()
onActivated(getClasses)

watch(() => state.quarter, getClasses)
watch(() => state.user.time, () => {
  if (!state.user.name) {
    classes = false
    cache.set('class' + state.quarter, false)
  } else getClasses()
})

const updateTime = () => {
  currTime.hour = (new Date()).getHours();
  currTime.minute = (new Date()).getMinutes();
  currTime.day = (new Date()).getDay();
  currTime.second = (new Date()).getSeconds();
  //this will be negative on sunday
  currTime.wTime = (currTime.day - 1) * 1440 + currTime.hour * 60 + currTime.minute;
};

//calculate the progress given current time and class time
//only consider the case within the same day
const updateProgress = () => {
  //today's upcoming or ongoing class
  const filteredClass = classes.filter(c => c.wTime[1] >= currTime.wTime);
  //if no class today, return 0
  if (classes && !classes.length) {
    currTime.nextEventTime = -1;
    return progress.percent = 0;
  }
  //if todays' classes has been finished, return 0
  if (classes && filteredClass.length === 0) {
    currTime.nextEventTime = -1;
    return progress.percent = 0;
  }

  //if there is a ongoing class
  if (classes && filteredClass.length > 0) {
    //it's ongoing
    if (filteredClass[0].wTime[0] <= currTime.wTime) {
      currClass = filteredClass[0];
      const time_passed = currTime.wTime - filteredClass[0].wTime[0];
      const duration = filteredClass[0].wTime[1] - filteredClass[0].wTime[0];
      currTime.nextEventTime = duration - time_passed;
      return progress.percent = time_passed / duration * 100;
    };

    //it's upcoming
    if (filteredClass[0].wTime[0] > currTime.wTime) {
      currTime.nextEventTime = filteredClass[0].wTime[0] - currTime.wTime;
      currClass = filteredClass[0];
      return progress.percent = 0;
    };

  };

  currTime.nextEventTime = -1;
  return progress.percent = 0;
};

// update every one minute
setInterval(() => {
  updateTime();
  updateProgress();
  //uplifting the current course
  classes.sort((a, b) => {if(a.course==currClass.course) return -1})
}, 1000)


function locate(location) {
  if (classrooms[location]) router.push('/map?q=' + location)
}

updateTime()
onActivated(updateTime)
</script>

  
<template>
  <div :class="(classes && !classes.length)?'h-28':'h-40'" class="min-w-[40%] mb-4 sm:mb-8 -mx-6 sm:mx-0 sm:max-w-full relative h-40 flex items-center overflow-x-auto bg-white p-4 sm:rounded border">
  <Transition name="fade" mode="out-in">
    <!-- Progress module -->
    <button v-if="!classes" class="bg-blue-500 rounded-full mx-10 px-4 py-2 font-bold text-white all-transition shadow hover:shadow-md" @click="router.push('/class')">Load your classes</button>
      <div v-else class="h-full flex items-center">
          <!-- Countdown module -->
          <div v-if="classes && currTime.nextEventTime != -1" class="-left-5 scale-75 relative grid grid-flow-col gap-5 top-4 text-center auto-cols-max">
                <div class="flex flex-col">
                  <span class="countdown font-mono text-5xl">
                    <span :style="'--value:' + Math.floor(currTime.nextEventTime / 60)"></span>
                  </span>
                  hours
                </div>
                <div class="flex flex-col">
                  <span class="countdown font-mono text-5xl">
                    <span :style="'--value:' + currTime.nextEventTime % 60"></span>
                  </span>
                  mins
                </div>
                <div class="flex flex-col">
                  <span class="countdown font-mono text-5xl">
                    <span :style="'--value:' + (59 - currTime.second)"></span>
                  </span>
                  seconds
                </div>
            </div>

        <div class="flex flex-row absolute top-2 left-5">
          <div class="relative top-2">
            <div v-if="classes.length>0 && currTime.nextEventTime != -1">
            <p v-if="progress.percent" class="border-x-0 border-b-0 text-xl font-bold pr-2">
            Current class
            </p>
            <p v-else class="border-x-0 border-b-0 text-xl font-bold pr-2">
              Next class
            </p>
            </div>

            <div v-if="classes.length>0 && currTime.nextEventTime == -1">
                <p class="border-x-0 border-b-0 text-xl font-bold">All clear today! 🍾️</p> 
            </div>
          </div>
          <!-- 'For more' button -->
            <button v-if="classes" :class="(classes && !classes.length)?'absolute -left-7 px-4 py-1 top-0':''" class="scale-75 bg-white rounded-full px-4 py-2 all-transition text-blue-500 flex items-center font-bold border hover:bg-gray-100 whitespace-nowrap" @click="router.push('/class')"><AcademicCapIcon class="w-6 mr-2" />Full Schedule</button>
        </div>


        <div v-for="c in classes" class="relative top-4 rounded-r-sm p-2 mx-1 overflow-hidden w-40" :class="(c.course==currClass.course)? 'bg-red-50':'bg-blue-50'">
              <div>
                <b>{{ c.course }}</b>
                <span class="text-xs ml-1" v-if="c.session">(session {{ c.session }})</span>
              </div>
              <div class="text-sm flex items-center" :class="classrooms[c.location] && 'cursor-pointer'" @click="locate(c.location)">
                {{ c.location }}
                <MapPinIcon class="ml-1 w-5 text-gray-500" v-if="classrooms[c.location]" />
              </div>
              <div class="text-sm">{{ c.time }}</div>
              <div class="all-transition absolute bottom-0 top-0 left-0 w-0.5" :class="(c.course==currClass.course)? 'bg-red-500':'bg-blue-500'" />
            </div>
            <div class="border-x-0 border-b-0 text-xl top-3 relative">
              <div v-if="classes && !classes.length">You don't have classes today! 👻</div>
            </div>
      </div>     
    </Transition>
  </div>
</template>

<style scoped></style>

<!-- 
<div v-if="currTime.nextEventTime != -1" class="mb-4 w-92 sm:mb-8 -mx-6 sm:mx-0 sm:max-w-full relative h-40 flex items-center overflow-x-auto bg-white p-4 sm:rounded border">
  <div class="flex-row flex">
    <p v-if="progress.percent" class="absolute top-4 left-5 border-x-0 border-b-0 text-xl font-bold pr-2">
      Current class
    </p>

    <p v-else class="absolute top-4 left-5 border-x-0 border-b-0 text-xl font-bold pr-2">
      Next class
    </p>


    <div class="relative rounded-r-sm top-4 p-2 mx-1 h-full bg-red-50 overflow-hidden w-40">
      //only showing upcoming class 
      <div>
        <b>{{ currClass.course }}</b>
        <span class="text-xs ml-1" v-if="currClass.session">(session {{ currClass.session }})</span>
      </div>
      <div class="text-sm flex items-center" :class="classrooms[currClass.location] && 'cursor-pointer'"
        @click="locate(currClass.location)">
        {{ currClass.location }}
        <MapPinIcon class="ml-1 w-5 text-gray-500" v-if="classrooms[currClass.location]" />
      </div>
      <div class="text-sm">{{ currClass.time }}</div>
      <div class="all-transition absolute bottom-0 top-0 left-0 w-0.5 bg-red-500" />
    </div>

    <div class="relative grid grid-flow-col mx-6 gap-5 top-5 text-center auto-cols-max">
      <div class="flex flex-col">
        <span class="countdown font-mono text-5xl">
          <span :style="'--value:' + Math.floor(currTime.nextEventTime / 60)"></span>
        </span>
        hours
      </div>
      <div class="flex flex-col">
        <span class="countdown font-mono text-5xl">
          <span :style="'--value:' + currTime.nextEventTime % 60"></span>
        </span>
        mins
      </div>
      <div class="flex flex-col">
        <span class="countdown font-mono text-5xl">
          <span :style="'--value:' + (59 - currTime.second)"></span>
        </span>
        seconds
      </div>
    </div>
    //<div v-if="progress.percent!=0" class="relative top-3 left-0 px-4">
        <div class="radial-progress font-bold" :style="'--value:'+progress.percent">{{String(Math.floor(progress.percent))+"%"}}</div> 
      </div> //
  </div>
</div>

<div v-else
  class="mb-4 w-30 sm:mb-8 -mx-6 sm:mx-0 sm:max-w-full relative h-16 flex overflow-x-auto bg-white p-4 sm:rounded border">
  <div class="flex mx-2 text-xl font-bold">
    <p>All clear today! 🍾️</p> 
   </div>
    </div>
  -->