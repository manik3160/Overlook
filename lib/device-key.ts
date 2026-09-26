// Browser-only: the per-device signing key. It is created once, stored in IndexedDB as a NON-EXTRACTABLE
// CryptoKey (the private half can be used to sign but never read out), and reused for every capture.
import { generateDeviceKey } from "@/lib/capture"

const DB = "overlook-device"
const STORE = "keys"
const KEY = "capture-v1"

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
const run = <T,>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

// If storage is blocked (private mode) an in-memory key is used for this page view: captures still verify,
// but the device id changes next visit.
let memory: CryptoKeyPair | null = null

export async function getDeviceKey(): Promise<CryptoKeyPair> {
  if (memory) return memory
  try {
    const db = await open()
    const saved = await run<CryptoKeyPair | undefined>(db, "readonly", (s) => s.get(KEY))
    if (saved?.privateKey && saved.publicKey) return (memory = saved)
    const fresh = await generateDeviceKey()
    await run(db, "readwrite", (s) => s.put(fresh, KEY))
    return (memory = fresh)
  } catch {
    return (memory = await generateDeviceKey())
  }
}
