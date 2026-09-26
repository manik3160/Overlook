import { describe, expect, it } from "vitest"
import { findInRegistry, isMd5, isPhash, type RegistryPhoto } from "./registry"

const p = (id: string, o: Partial<RegistryPhoto> = {}): RegistryPhoto => ({ id, etag: `e-${id}`, phash: "ffffffffffffffff", project_id: "p1", created_at: "2026-09-10T00:00:00Z", parent_asset_id: null, ...o })

describe("findInRegistry", () => {
  it("finds the same file and near copies, oldest first", () => {
    const r = findInRegistry({ etag: "e-x", phash: "0000000000000000" }, [
      p("near-new", { phash: "0000000000000003", created_at: "2026-09-12T00:00:00Z", project_id: "p2" }),
      p("same", { etag: "e-x", created_at: "2026-09-11T00:00:00Z" }),
      p("near-old", { phash: "0000000000000001", created_at: "2026-09-01T00:00:00Z" }),
      p("unrelated"),
    ])
    expect(r.matches.map((m) => `${m.photo.id}:${m.kind}:${m.distance}`)).toEqual(["near-old:near:1", "same:exact:0", "near-new:near:2"])
    expect(r.firstSeen?.photo.id).toBe("near-old")
    expect(r.projects).toBe(2)
  })
  it("stops at the near-duplicate distance (6 bits)", () => {
    expect(findInRegistry({ etag: null, phash: "0000000000000000" }, [p("a", { phash: "000000000000003f" })]).matches).toHaveLength(1) // 6 bits
    expect(findInRegistry({ etag: null, phash: "0000000000000000" }, [p("b", { phash: "000000000000007f" })]).matches).toHaveLength(0) // 7 bits
  })
  it("reports nothing found", () => {
    expect(findInRegistry({ etag: "e-none", phash: null }, [p("a")])).toEqual({ matches: [], firstSeen: null, projects: 0 })
  })
  it("validates fingerprint formats for the API", () => {
    expect(isMd5("d41d8cd98f00b204e9800998ecf8427e")).toBe(true)
    expect(isMd5("xyz")).toBe(false)
    expect(isPhash("8f3e0c1a2b4d6e7f")).toBe(true)
    expect(isPhash("8f3e")).toBe(false)
  })
})
