import "server-only"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { parseNonce } from "@/lib/capture"

// Nonces are stateless: `<issuedAtMs>.<random>.<hmac>`. The HMAC key is derived from the service role key,
// so no new environment variable is needed and the key never leaves the server.
const macKey = () => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return createHmac("sha256", "overlook-capture-nonce").update(secret).digest()
}
const mac = (issuedAt: number, random: string) => createHmac("sha256", macKey()).update(`${issuedAt}.${random}`).digest("base64url")

export function issueNonce(nowMs = Date.now()): string {
  const random = randomBytes(12).toString("base64url")
  return `${nowMs}.${random}.${mac(nowMs, random)}`
}

// The nonce was issued by this server (mac matches). Age and reuse are checked separately.
export function nonceIsGenuine(nonce: string): { issuedAt: number } | null {
  const parts = parseNonce(nonce)
  if (!parts) return null
  const expected = Buffer.from(mac(parts.issuedAt, parts.random))
  const given = Buffer.from(parts.mac)
  return expected.length === given.length && timingSafeEqual(expected, given) ? { issuedAt: parts.issuedAt } : null
}
