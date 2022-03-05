<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const links = [{
  name: 'GauchoSpace',
  url: 'https://sso.ucsb.edu:8443/cas/login?service=https%3A%2F%2Fgauchospace.ucsb.edu%2Fcourses%2Flogin%2Findex.php%3FauthCAS%3DCAS'
}, {
  name: 'GOLD',
  url: 'https://my.sa.ucsb.edu/gold/'
}, {
  name: 'Student Health',
  url: 'https://sso.ucsb.edu/cas/login?service=https%3a%2f%2fstudenthealthoc.sa.ucsb.edu%2f'
}, {
  name: 'BRAC',
  url: 'https://mybarc.ucsb.edu/SIWeb/login.jsp'
}, {
  name: 'Kronos',
  url: 'https://logon.timekeeping.ucsb.edu/wfc/navigator/logon'
}, {
  name: 'Box',
  url: 'https://sso.services.box.net/sp/startSSO.ping?PartnerIdpId=urn:mace:incommon:ucsb.edu&TargetResource=https%3A%2F%2Fucsb.account.box.com%2Fsso%2Fping_federate%3Ffrom%3Dbox%26redirect_url%3D%252F'
}]
</script>

<template>
  <div class="p-4 sm:p-10">
    <h1 class="text-2xl">Links</h1>
    <p class="text-sm text-gray-500">Direct links to portals</p>
    <div class="flex items-center flex-wrap my-4">
      <a v-for="l in links" class="all-transition cursor-pointer rounded-full bg-white text-center py-2 m-2 w-full sm:w-64 font-bold border hover:shadow hover:bg-blue-50" :href="l.url">{{ l.name }}</a>
    </div>
  </div>
</template>