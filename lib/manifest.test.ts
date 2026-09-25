import { describe, expect, it } from "vitest"
import { canonicalJson, manifestHash, reportSlideUrl, reportThumbUrl, sha256Hex } from "./manifest"

describe("canonicalJson", () => {
  it("sorts keys at every level and drops whitespace", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } })).toBe('{"a":{"c":[3,{"y":2,"z":1}],"d":2},"b":1}')
  })
  it("is independent of key insertion order", () => {
    expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }))
  })
  it("keeps array order (order is meaningful)", () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]))
  })
  it("omits undefined properties and handles null, booleans, strings", () => {
    expect(canonicalJson({ a: undefined, b: null, c: true, d: 'q"uote' })).toBe('{"b":null,"c":true,"d":"q\\"uote"}')
  })
  it("rejects values that cannot be hashed reliably", () => {
    expect(() => canonicalJson({ a: NaN })).toThrow()
    expect(() => canonicalJson({ a: Infinity })).toThrow()
  })
})

describe("manifestHash", () => {
  const manifest = { project: { name: "Cleanup", radius_m: 300 }, assets: [{ public_id: "a", trust_score: 100 }] }
  it("matches a known SHA-256", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  })
  it("is stable across key order and a JSON round trip", () => {
    const reordered = { assets: [{ trust_score: 100, public_id: "a" }], project: { radius_m: 300, name: "Cleanup" } }
    expect(manifestHash(reordered)).toBe(manifestHash(manifest))
    expect(manifestHash(JSON.parse(JSON.stringify(manifest)))).toBe(manifestHash(manifest))
  })
  it("changes when any value is altered (tamper evidence)", () => {
    const tampered = structuredClone(manifest)
    tampered.assets[0].trust_score = 99
    expect(manifestHash(tampered)).not.toBe(manifestHash(manifest))
    const renamed = structuredClone(manifest)
    renamed.project.name = "Cleanup!"
    expect(manifestHash(renamed)).not.toBe(manifestHash(manifest))
  })
  it("changes when an asset is added or removed", () => {
    expect(manifestHash({ ...manifest, assets: [] })).not.toBe(manifestHash(manifest))
  })
})

describe("report image URLs", () => {
  const url = "https://res.cloudinary.com/demo/image/upload/v123/evidence/inbox/abc.png"
  it("pixelates faces, fixes the size, and forces a .jpg URL", () => {
    expect(reportThumbUrl(url)).toBe("https://res.cloudinary.com/demo/image/upload/e_pixelate_faces/c_fill,w_400,h_300,f_jpg,q_auto/v123/evidence/inbox/abc.jpg")
    expect(reportSlideUrl(url)).toContain("w_800,h_600")
    expect(reportSlideUrl(url).endsWith(".jpg")).toBe(true)
  })
})
