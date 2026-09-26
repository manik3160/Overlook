import { describe, expect, it } from "vitest"
import { videoPreviewUrl } from "./cloudinary-url"
import { enhanceCompare, recipeOf, renditionsFor, type RenditionAsset } from "./renditions"

const base: RenditionAsset = {
  public_id: "evidence/real/a-before-1",
  secure_url: "https://res.cloudinary.com/demo/image/upload/v1790352893/evidence/real/a-before-1.jpg",
  resource_type: "image", trust_score: 90, review_status: "unreviewed", width: 4000, height: 3000,
}

describe("recipeOf", () => {
  it("is empty for the original", () => expect(recipeOf(base.secure_url, base.public_id)).toBe(""))
  it("reads a replace-style URL up to the version", () => {
    expect(recipeOf("https://res.cloudinary.com/demo/image/upload/c_fill,w_240,h_240,f_auto,q_auto/v1790352893/evidence/real/a-before-1.jpg", base.public_id)).toBe("c_fill,w_240,h_240,f_auto,q_auto")
  })
  it("reads a card URL (no version) up to the public id, keeping layer ids", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/e_pixelate_faces/c_fill,w_1080,h_1080/l_text:Arial_56_bold:Hi,co_white/fl_layer_apply,g_south/evidence/real/a-before-1.jpg"
    expect(recipeOf(url, base.public_id)).toBe("e_pixelate_faces/c_fill,w_1080,h_1080/l_text:Arial_56_bold:Hi,co_white/fl_layer_apply,g_south")
  })
})

describe("renditionsFor", () => {
  const keys = (a: RenditionAsset) => renditionsFor(a, { cloud: "demo", projectName: "Cleanup" }).map((r) => r.key)
  it("shows campaign cards only for verified photos", () => {
    expect(keys(base)).toEqual(["original", "thumb", "blur", "slide", "report", "enhanced", "instagram", "story"])
    expect(keys({ ...base, trust_score: 60 })).toEqual(["original", "thumb", "blur", "slide", "report", "enhanced"])
    expect(keys({ ...base, trust_score: 60, review_status: "approved" })).toContain("instagram")
    expect(keys({ ...base, review_status: "rejected" })).not.toContain("instagram")
  })
  it("marks the face-hidden versions", () => {
    const r = renditionsFor(base, { cloud: "demo", projectName: null })
    expect(r.filter((x) => x.pixelated).map((x) => x.key)).toEqual(["report", "enhanced", "instagram", "story"])
  })
  it("gives videos only the versions the app makes for them", () => {
    expect(keys({ ...base, resource_type: "video", secure_url: base.secure_url.replace(".jpg", ".mp4") })).toEqual(["original", "thumb", "blur"])
  })
})

describe("tile previews", () => {
  it("shows a small copy of the original but links to the untouched file", () => {
    const [orig, thumb] = renditionsFor(base, { cloud: "demo", projectName: null })
    expect(orig.url).toBe(base.secure_url)
    expect(orig.preview).toContain("/upload/c_limit,w_480,h_480,f_auto,q_auto/")
    expect(orig.recipe).toBe("")
    expect(thumb.preview).toBe(thumb.url)
  })
})

describe("enhanceCompare", () => {
  it("compares the same crop with and without Cloudinary AI enhance, faces hidden on both", () => {
    const { before, after } = enhanceCompare(base.secure_url)
    expect(before).toContain("/upload/e_pixelate_faces/c_limit,w_800,h_800,f_auto,q_auto/v1790352893/")
    expect(after).toContain("/upload/e_enhance/e_pixelate_faces/c_limit,w_800,h_800,f_auto,q_auto/v1790352893/")
  })
})

describe("videoPreviewUrl", () => {
  it("builds the e_preview clip URL that was checked live (mp4, 4 s, tile-sized)", () => {
    expect(videoPreviewUrl("https://res.cloudinary.com/demo/video/upload/v1/video-uploads/abc.mov"))
      .toBe("https://res.cloudinary.com/demo/video/upload/e_preview:duration_4/c_fill,w_240,h_240,q_auto/v1/video-uploads/abc.mp4")
  })
})
