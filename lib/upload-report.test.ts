import { describe, expect, it } from "vitest"
import { uploadReport } from "./upload-report"

const meta = { lat: 28.6, lng: 77.2, takenAt: "2026-09-20T04:45:30.000Z", hasCameraData: true }
const none = { lat: null, lng: null, takenAt: null, hasCameraData: false }

describe("uploadReport", () => {
  it("confirms metadata the browser sent, or reports what Cloudinary found for imports", () => {
    expect(uploadReport({ trust_flags: [] }, meta, true)).toEqual({ text: "Cloudinary read the file: GPS and time confirmed", tone: "ok" })
    expect(uploadReport({ trust_flags: [] }, meta, false).text).toBe("Cloudinary read the file: GPS and time found")
    expect(uploadReport({ trust_flags: [] }, { ...meta, takenAt: null }, true).text).toBe("Cloudinary read the file: GPS confirmed")
  })
  it("says plainly when the file has nothing inside", () => {
    expect(uploadReport({ trust_flags: [{ code: "NO_METADATA" }] }, none, false)).toEqual({ text: "Cloudinary read the file: no location or time inside it", tone: "info" })
  })
  it("puts the problems Cloudinary helped find first", () => {
    expect(uploadReport({ trust_flags: [{ code: "DUPLICATE_REUSED" }, { code: "METADATA_MISMATCH" }] }, meta, true).text).toMatch(/doesn't match/)
    expect(uploadReport({ trust_flags: [{ code: "DUPLICATE_EXACT" }] }, meta, true)).toMatchObject({ tone: "warn", text: expect.stringMatching(/exact file/) })
    expect(uploadReport({ trust_flags: [{ code: "DUPLICATE_REUSED" }] }, none, false).text).toMatch(/near-identical/)
  })
  it("handles videos and an unreachable Cloudinary", () => {
    expect(uploadReport({ resource_type: "video" }, null, false).tone).toBe("info")
    expect(uploadReport({ trust_flags: [] }, null, true).text).toBe("Stored by Cloudinary")
  })
})
