import { describe, expect, it } from "vitest"
import { audioSourceUrl, formatClock, frameSeconds, framePublicId, frameSourceUrl, playerUrl, snippet } from "./video"

describe("frameSeconds", () => {
  it("one frame about every 15 s, starting at 1 s", () => {
    expect(frameSeconds(45)).toEqual([1, 16, 31])
    expect(frameSeconds(90)).toEqual([1, 16, 31, 46, 61, 76])
  })
  it("never more than 8 frames; long videos are spread evenly", () => {
    expect(frameSeconds(120)).toHaveLength(8)
    expect(frameSeconds(120).at(-1)).toBe(106)
    const long = frameSeconds(600)
    expect(long).toHaveLength(8)
    expect(long.at(-1)!).toBeLessThan(600)
  })
  it("short videos still get one frame", () => {
    expect(frameSeconds(10)).toEqual([1])
    expect(frameSeconds(1.5)).toEqual([0])
  })
  it("every frame is inside the video", () => {
    for (const d of [3, 14, 15, 16, 29.9, 44, 61, 119, 121, 305]) for (const t of frameSeconds(d)) expect(t).toBeLessThan(d)
  })
  it("returns nothing for missing or invalid durations", () => {
    expect(frameSeconds(0)).toEqual([])
    expect(frameSeconds(NaN)).toEqual([])
    expect(frameSeconds(-5)).toEqual([])
  })
})

describe("urls and labels", () => {
  it("builds frame and audio source URLs", () => {
    expect(frameSourceUrl("demo", "evidence/inbox/abc", 16)).toBe("https://res.cloudinary.com/demo/video/upload/so_16/evidence/inbox/abc.jpg")
    expect(audioSourceUrl("demo", "evidence/inbox/abc")).toBe("https://res.cloudinary.com/demo/video/upload/du_300/evidence/inbox/abc.mp3")
  })
  it("frame public ids are deterministic and unique per second", () => {
    expect(framePublicId("evidence/inbox/abc", 16)).toBe("evidence/frames/abc-s16")
    expect(framePublicId("evidence/inbox/abc", 16)).toBe(framePublicId("evidence/inbox/abc", 16))
    expect(framePublicId("evidence/inbox/abc", 1)).not.toBe(framePublicId("evidence/inbox/abc", 16))
  })
  it("player URL seeks to the exact second and never stacks fragments", () => {
    expect(playerUrl("https://x/v.mp4", 16.9)).toBe("https://x/v.mp4#t=16")
    expect(playerUrl("https://x/v.mp4#t=3", 31)).toBe("https://x/v.mp4#t=31")
  })
  it("formats clock times", () => {
    expect(formatClock(5)).toBe("0:05")
    expect(formatClock(75)).toBe("1:15")
    expect(formatClock(3600)).toBe("60:00")
  })
})

describe("snippet", () => {
  const text = "Today our volunteers cleaned the riverside lane. We collected forty bags of garbage near the old banyan tree. The pond looks cleaner now."
  it("centres on the match, case-insensitively, with ellipses", () => {
    const s = snippet(text, "BANYAN", 20)
    expect(s).toContain("banyan")
    expect(s.startsWith("…") && s.endsWith("…")).toBe(true)
  })
  it("falls back to the start of the transcript when nothing matches", () => {
    expect(snippet(text, "zebra", 30).startsWith("Today our")).toBe(true)
  })
  it("returns short text unchanged", () => expect(snippet("hello world", "")).toBe("hello world"))
})
