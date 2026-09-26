import { describe, expect, it } from "vitest"
import { checkParamsToSign } from "./sign-policy"

const now = 1_790_000_000
const opts = { preset: "overlook_signed", nowS: now }
const ok = { timestamp: now, upload_preset: "overlook_signed", folder: "evidence/inbox", phash: "true" }

describe("checkParamsToSign", () => {
  it("accepts what the app's uploaders send", () => {
    expect(checkParamsToSign(ok, opts)).toEqual({ ok: true })
    expect(checkParamsToSign({ ...ok, folder: "evidence/1b8ec09e-8143-49b5-b450-bce09e0eb55e" }, opts).ok).toBe(true)
    expect(checkParamsToSign({ ...ok, folder: "registry-checks" }, opts).ok).toBe(true)
    expect(checkParamsToSign({ ...ok, source: "uw", image_metadata: true }, opts).ok).toBe(true)
  })
  it("refuses anything that could overwrite or redirect an upload", () => {
    for (const bad of [{ public_id: "evidence/real/a-after-1" }, { overwrite: true }, { type: "authenticated" }, { notification_url: "https://x" }, { eager: "c_fill" }]) {
      const r = checkParamsToSign({ ...ok, ...bad }, opts)
      expect(r.ok).toBe(false)
    }
  })
  it("refuses stale timestamps, other presets, other folders and odd values", () => {
    expect(checkParamsToSign({ ...ok, timestamp: now - 3600 }, opts).ok).toBe(false)
    expect(checkParamsToSign({ ...ok, upload_preset: "other" }, opts).ok).toBe(false)
    expect(checkParamsToSign({ ...ok, folder: "overlook/public" }, opts).ok).toBe(false)
    expect(checkParamsToSign({ ...ok, folder: "evidence/../x" }, opts).ok).toBe(false)
    expect(checkParamsToSign({ ...ok, phash: "false" }, opts).ok).toBe(false)
    expect(checkParamsToSign({ ...ok, source: "api" }, opts).ok).toBe(false)
    expect(checkParamsToSign(ok, { ...opts, preset: undefined }).ok).toBe(false)
  })
})
