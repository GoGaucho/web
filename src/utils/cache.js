import { getFunctions, httpsCallable } from 'firebase/functions'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js'

export default async function (opt, value) {
  const id = opt + '.' + (value || '')
  const res = (await getDoc(doc(db, 'cache', id))).data()
  if (res && res.timestamp > Date.now() - 300e3) return JSON.parse(res.data)
  const functions = getFunctions()
  const cache = httpsCallable(functions, 'cache')
  return await cache({ opt, value }).then(r => JSON.parse(r.data.data))
}
