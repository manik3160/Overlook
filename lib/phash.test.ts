import { describe, expect, it } from "vitest"
import { hammingDistance, isNearDuplicate } from "./phash"

describe("hammingDistance", () => {
  it("is 0 for identical hashes", () => expect(hammingDistance("c9635a63eacf11c1", "c9635a63eacf11c1")).toBe(0))
  it("counts differing bits", () => {
    expect(hammingDistance("0000000000000000", "0000000000000001")).toBe(1)
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4)
    expect(hammingDistance("ffffffffffffffff", "0000000000000000")).toBe(64)
  })
  it("is case-insensitive", () => expect(hammingDistance("ABCDEF0123456789", "abcdef0123456789")).toBe(0))
  it("returns null when not comparable", () => {
    expect(hammingDistance(null, "00")).toBeNull()
    expect(hammingDistance("00", "0000")).toBeNull()
    expect(hammingDistance("zz", "00")).toBeNull()
  })
})

describe("isNearDuplicate", () => {
  it("uses a threshold of 6 bits", () => {
    expect(isNearDuplicate("0000000000000000", "000000000000003f")).toBe(true) // 6 bits
    expect(isNearDuplicate("0000000000000000", "000000000000007f")).toBe(false) // 7 bits
  })
  it("is false for unknown hashes", () => expect(isNearDuplicate(null, null)).toBe(false))
})
