import { describe, expect, it } from "vitest"
import { createHash } from "node:crypto"
import { bitcoinHeight, mergeUpgrade, otsFile, parseTimestamp, pendingBytes, readOtsFile } from "./ots"

// A real response from https://a.pool.opentimestamps.org/digest (captured 26 Sep 2026).
const FIXTURE = {"digest":"61a76053229b5a37258a32e0acb7c21afb9fbeaf50a7cda22d4f972abb59d65c","proof":"f008e76d02d4a753a73a08f010a803e8fbcf33bd8d3fab046bb532602808f0207fa703677287f653bb1664d01407a20521a175001e997fd91b9cab50faf8b38308f02041948c5b0fae6f7a4ce0391fc56b9024b0fca9714a02537c376c14fb81e1aa0b08f02052859488cda9fe0bd7aa6ac041dd38051b6a6fc27f918f3a6c1568e0d0ca9e8008f1046ab737acf00861cea156547eabaf0083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267"}
const digest = Buffer.from(FIXTURE.digest, "hex")
const proof = Buffer.from(FIXTURE.proof, "hex")

describe("parseTimestamp", () => {
  it("follows a real calendar proof to its pending attestation", () => {
    const [a] = parseTimestamp(digest, proof)
    expect(a).toMatchObject({ type: "pending", uri: "https://alice.btc.calendar.opentimestamps.org" })
    expect(a.commitment).toMatch(/^[0-9a-f]+$/)
  })
  it("reads a bitcoin attestation's block height, including inside a fork", () => {
    // fork: [pending "x"] and [sha256 -> bitcoin height 850000]
    const pending = Buffer.concat([Buffer.from("0083dfe30d2ef90c8e", "hex"), Buffer.from([2, 1]), Buffer.from("x")])
    const varuint850000 = Buffer.from([0xd0, 0xf0, 0x33]) // 850000 = 0x33 * 16384 + 0x70 * 128 + 0x50
    const bitcoin = Buffer.concat([Buffer.from([0x08, 0x00]), Buffer.from("0588960d73d71901", "hex"), Buffer.from([varuint850000.length]), varuint850000])
    const as = parseTimestamp(digest, Buffer.concat([Buffer.from([0xff]), pending, bitcoin]))
    expect(as.map((a) => a.type)).toEqual(["pending", "bitcoin"])
    expect(bitcoinHeight(as)).toBe(850000)
    expect(as[1].commitment).toBe(createHash("sha256").update(digest).digest("hex"))
  })
  it("rejects truncated or unknown data instead of guessing", () => {
    expect(() => parseTimestamp(digest, proof.subarray(0, proof.length - 5))).toThrow()
    expect(() => parseTimestamp(digest, Buffer.from([0x99]))).toThrow(/unsupported/)
    expect(() => parseTimestamp(digest, Buffer.concat([proof, Buffer.from([0x08])]))).toThrow(/trailing/)
  })
})

describe(".ots file", () => {
  it("round-trips: header, sha256 op, digest, and every calendar's proof as a fork", () => {
    const file = otsFile(digest, [proof, proof])
    expect(file.subarray(0, 16).toString("latin1")).toBe("\x00OpenTimestamps\x00")
    const back = readOtsFile(file)
    expect(back.digest.equals(digest)).toBe(true)
    expect(back.attestations.filter((a) => a.type === "pending")).toHaveLength(2)
    expect(bitcoinHeight(back.attestations)).toBeNull()
  })
  it("refuses a digest that is not SHA-256 sized", () => {
    expect(() => otsFile(Buffer.alloc(20), [proof])).toThrow()
  })
})

describe("mergeUpgrade", () => {
  it("replaces the pending ending with the calendar's upgrade, keeping the path valid", () => {
    const [pending] = parseTimestamp(digest, proof)
    if (pending.type !== "pending") throw new Error("expected pending")
    const upgraded = Buffer.concat([Buffer.from([0x08, 0x00]), Buffer.from("0588960d73d71901", "hex"), Buffer.from([3, 0xd0, 0xf0, 0x33])])
    const merged = mergeUpgrade(proof, pending.uri, upgraded)!
    const as = parseTimestamp(digest, merged)
    expect(as).toHaveLength(1)
    expect(as[0]).toMatchObject({ type: "bitcoin", height: 850000 })
    // the bitcoin commitment is sha256 of the old pending commitment: the path really continues from it
    expect(as[0].commitment).toBe(createHash("sha256").update(Buffer.from(pending.commitment, "hex")).digest("hex"))
  })
  it("serialises pending attestations exactly like the calendar", () => {
    expect(proof.subarray(proof.length - pendingBytes("https://alice.btc.calendar.opentimestamps.org").length).equals(pendingBytes("https://alice.btc.calendar.opentimestamps.org"))).toBe(true)
  })
  it("returns null when the proof does not end in that calendar's pending attestation", () => {
    expect(mergeUpgrade(proof, "https://other.example", Buffer.from([0]))).toBeNull()
  })
})
