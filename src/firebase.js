import { initializeApp } from 'firebase/app'
import { getAnalytics, logEvent } from 'firebase/analytics'
import { getPerformance } from "firebase/performance"
import { getFirestore, initializeFirestore, persistentLocalCache, getDoc, doc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

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

export const app = initializeApp(firebaseConfig)

initializeFirestore(app, { localCache: persistentLocalCache({}) })
export const db = getFirestore()
export const get = path => getDoc(doc(db, path)).then(r => r.data())

const analytics = getAnalytics(app)
export const log = (k, p = {}) => logEvent(analytics, k, p)

getPerformance(app)

const functions = getFunctions(app)
export const call = (name, params = {}) => httpsCallable(functions, name)(params).then(r => r.data)
