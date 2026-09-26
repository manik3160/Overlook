import { describe, expect, it } from "vitest"
import { canonicalPayload, checkTiming, deviceId, exportPublicKey, generateDeviceKey, NONCE_MAX_AGE_MS, parseNonce, plausibleLocation, sha256Hex, signPayload, verifySignature, type CapturePayload } from "./capture"

const payload = (o: Partial<CapturePayload> = {}): CapturePayload => ({
  v: 1, sha256: "a".repeat(64), lat: 44.7508, lng: -122.4155, accuracyM: 8, capturedAt: "2026-10-05T10:00:00.000Z", nonce: "1.r.m", projectId: "p1", ghostAssetId: "g1", ...o,
})

describe("signing", () => {
  it("verifies a payload signed by the same device", async () => {
    const pair = await generateDeviceKey()
    const sig = await signPayload(pair.privateKey, payload())
    expect(await verifySignature(await exportPublicKey(pair), payload(), sig)).toBe(true)
  })

  it("rejects any changed field (photo hash, place, time, nonce, ghost)", async () => {
    const pair = await generateDeviceKey()
    const key = await exportPublicKey(pair)
    const sig = await signPayload(pair.privateKey, payload())
    for (const change of [{ sha256: "b".repeat(64) }, { lat: 44.76 }, { lng: -122.4 }, { capturedAt: "2026-10-05T10:01:00.000Z" }, { nonce: "2.r.m" }, { ghostAssetId: "g2" }, { accuracyM: 1 }]) {
      expect(await verifySignature(key, payload(change), sig)).toBe(false)
    }
  })

  it("rejects a signature from a different device", async () => {
    const a = await generateDeviceKey(), b = await generateDeviceKey()
    const sig = await signPayload(a.privateKey, payload())
    expect(await verifySignature(await exportPublicKey(b), payload(), sig)).toBe(false)
  })

  it("returns false (not a crash) for garbage input", async () => {
    const pair = await generateDeviceKey()
    const key = await exportPublicKey(pair)
    expect(await verifySignature(key, payload(), "not base64 !!")).toBe(false)
    expect(await verifySignature({ ...key, x: "bad" }, payload(), "AAAA")).toBe(false)
  })

  it("device id is stable per key and differs between devices", async () => {
    const a = await generateDeviceKey(), b = await generateDeviceKey()
    const ka = await exportPublicKey(a)
    expect(await deviceId(ka)).toBe(await deviceId(ka))
    expect(await deviceId(ka)).toMatch(/^[0-9a-f]{12}$/)
    expect(await deviceId(ka)).not.toBe(await deviceId(await exportPublicKey(b)))
  })

  it("canonical form has a fixed field order", () => {
    expect(canonicalPayload(payload())).toBe(`[1,"${"a".repeat(64)}",44.7508,-122.4155,8,"2026-10-05T10:00:00.000Z","1.r.m","p1","g1"]`)
  })

  it("sha256Hex matches the known digest of 'abc'", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  })
})

describe("nonce + timing", () => {
  it("parses issuedAt/random/mac and rejects malformed nonces", () => {
    expect(parseNonce("1790000000000.abc.def")).toEqual({ issuedAt: 1790000000000, random: "abc", mac: "def" })
    for (const bad of ["", "x.y.z", "1.2", "1.2.3.4", "0.a.b", "-5.a.b"]) expect(parseNonce(bad)).toBeNull()
  })

  const issued = Date.parse("2026-10-05T10:00:00Z")
  it("accepts a photo taken inside the window", () => {
    expect(checkTiming(issued, "2026-10-05T10:03:00Z", issued + 5 * 60_000).ok).toBe(true)
  })
  it("rejects an expired session, a photo older than its session and a future timestamp", () => {
    expect(checkTiming(issued, "2026-10-05T10:03:00Z", issued + NONCE_MAX_AGE_MS + 1).ok).toBe(false)
    expect(checkTiming(issued, "2026-10-05T09:00:00Z", issued + 60_000).ok).toBe(false)
    expect(checkTiming(issued, "2026-10-05T11:00:00Z", issued + 60_000).ok).toBe(false)
    expect(checkTiming(issued, "yesterday", issued + 60_000).ok).toBe(false)
  })
})

describe("plausibleLocation", () => {
  it("accepts real fixes and rejects null island, out of range and poor accuracy", () => {
    expect(plausibleLocation(44.75, -122.41, 12)).toBe(true)
    expect(plausibleLocation(0, 0, 5)).toBe(false)
    expect(plausibleLocation(91, 10, 5)).toBe(false)
    expect(plausibleLocation(20, 10, 9000)).toBe(false)
    expect(plausibleLocation(Number.NaN, 10, null)).toBe(false)
  })
})
