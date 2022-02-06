import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyC7WZFIjRUQ01A-SCVs0V_bNdhC8YCPzoI',
  authDomain: 'fir-gogaucho.firebaseapp.com',
  databaseURL: 'https://fir-gogaucho.firebaseio.com',
  projectId: 'firebase-gogaucho',
  storageBucket: 'firebase-gogaucho.appspot.com',
  messagingSenderId: '1083649636208',
  appId: '1:1083649636208:web:690b97b048d194077241b5',
  measurementId: 'G-N2YCM7TLPH'
}

const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

export default app

export const db = getFirestore()
