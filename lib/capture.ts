// Signed live capture. PURE (uses only WebCrypto, so it runs in the browser AND in Node): the phone signs
// {file hash, GPS, time, server nonce} with a per-device key; the server checks it. EXIF is trivial to fake
// and WhatsApp strips it; a signature made at capture time, bound to a fresh server nonce, is not.
// Limits (say them in the pitch): it proves WHICH device signed WHAT and WHEN, not that the GPS sensor was honest
// (a desktop browser can mock location); the flag wording is "captured live", never "guaranteed genuine".

export const NONCE_MAX_AGE_MS = 10 * 60 * 1000 // the photo must be taken and signed within 10 min of the nonce
const CLOCK_SKEW_MS = 60_000

export type CapturePayload = {
  v: 1
  sha256: string // SHA-256 of the exact bytes uploaded
  lat: number
  lng: number
  accuracyM: number | null
  capturedAt: string // ISO, from the device clock (bounded by the nonce window)
  nonce: string
  projectId: string | null
  ghostAssetId: string | null // the "before" photo this was lined up against
}
export type PublicKeyJwk = { kty: "EC"; crv: "P-256"; x: string; y: string }

// Fixed field order, so client and server always sign/verify the same bytes.
export const canonicalPayload = (p: CapturePayload): string =>
  JSON.stringify([p.v, p.sha256, p.lat, p.lng, p.accuracyM, p.capturedAt, p.nonce, p.projectId, p.ghostAssetId])

const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const
const SIGN = { name: "ECDSA", hash: "SHA-256" } as const
const enc = new TextEncoder()

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const toHex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("")

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const view = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data.slice(0))
  return toHex(await crypto.subtle.digest("SHA-256", view))
}

// Short, stable id for a device: the first 12 hex chars of SHA-256 over its public key.
export const deviceId = async (key: PublicKeyJwk): Promise<string> => (await sha256Hex(enc.encode(`${key.x}.${key.y}`))).slice(0, 12)

export const generateDeviceKey = () => crypto.subtle.generateKey(ECDSA, false, ["sign", "verify"]) // private key is non-extractable

export async function exportPublicKey(pair: CryptoKeyPair): Promise<PublicKeyJwk> {
  const { kty, crv, x, y } = await crypto.subtle.exportKey("jwk", pair.publicKey)
  return { kty, crv, x, y } as PublicKeyJwk
}

export async function signPayload(privateKey: CryptoKey, payload: CapturePayload): Promise<string> {
  return toB64(new Uint8Array(await crypto.subtle.sign(SIGN, privateKey, enc.encode(canonicalPayload(payload)))))
}

export async function verifySignature(key: PublicKeyJwk, payload: CapturePayload, signatureB64: string): Promise<boolean> {
  try {
    const pub = await crypto.subtle.importKey("jwk", { ...key, ext: true }, ECDSA, false, ["verify"])
    return await crypto.subtle.verify(SIGN, pub, fromB64(signatureB64), enc.encode(canonicalPayload(payload)))
  } catch {
    return false // malformed key or signature
  }
}

// Nonce format: `<issuedAtMs>.<random>.<mac>`; the mac is added and checked on the server only.
export function parseNonce(nonce: string): { issuedAt: number; random: string; mac: string } | null {
  const [issued, random, mac, ...rest] = nonce.split(".")
  const issuedAt = Number(issued)
  if (rest.length || !random || !mac || !Number.isInteger(issuedAt) || issuedAt <= 0) return null
  return { issuedAt, random, mac }
}

export type TimingCheck = { ok: true } | { ok: false; reason: string }
export function checkTiming(issuedAt: number, capturedAtIso: string, nowMs: number): TimingCheck {
  const captured = Date.parse(capturedAtIso)
  if (Number.isNaN(captured)) return { ok: false, reason: "capture time is not a valid date" }
  if (nowMs - issuedAt > NONCE_MAX_AGE_MS) return { ok: false, reason: "the capture session expired (10 minutes); open the camera again" }
  if (issuedAt > nowMs + CLOCK_SKEW_MS) return { ok: false, reason: "the capture session is from the future" }
  if (captured < issuedAt - CLOCK_SKEW_MS) return { ok: false, reason: "the photo is older than its capture session" }
  if (captured > nowMs + CLOCK_SKEW_MS) return { ok: false, reason: "the capture time is in the future" }
  return { ok: true }
}

export const plausibleLocation = (lat: number, lng: number, accuracyM: number | null): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0) && (accuracyM === null || (accuracyM >= 0 && accuracyM <= 5000))

// What we store in assets.capture_proof after the server has verified everything.
export type CaptureProof = { payload: CapturePayload; signature: string; publicKey: PublicKeyJwk; deviceId: string; verifiedAt: string; verified: true }
