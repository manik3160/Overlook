import { describe, expect, it } from "vitest"
import { scanProvenance } from "./provenance"

const JPEG_START = Buffer.from([0xff, 0xd8])
// An APP1 XMP packet, as IPTC-aware tools (and e.g. Google's image models) write it.
const xmp = (sourceType: string, extra = "") =>
  Buffer.from(`http://ns.adobe.com/xap/1.0/\0<x:xmpmeta><rdf:Description Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/${sourceType}" ${extra}/></x:xmpmeta>`, "latin1")
const file = (...parts: Buffer[]) => new Uint8Array(Buffer.concat([JPEG_START, ...parts, Buffer.alloc(1000, 0x11)]))

describe("scanProvenance", () => {
  it("an ordinary photo declares nothing", () => {
    expect(scanProvenance(file(Buffer.from("Exif\0\0Canon EOS")))).toEqual({ hasContentCredentials: false, aiDeclared: false, composite: false, source: null })
  })
  it("IPTC digital source type trainedAlgorithmicMedia = declared AI", () => {
    expect(scanProvenance(file(xmp("trainedAlgorithmicMedia")))).toMatchObject({ aiDeclared: true, composite: false })
  })
  it("composite (AI-edited) counts as declared too, and is marked composite", () => {
    expect(scanProvenance(file(xmp("compositeWithTrainedAlgorithmicMedia")))).toMatchObject({ aiDeclared: true, composite: true })
  })
  it("a camera photo's source type (digitalCapture) is not AI", () => {
    expect(scanProvenance(file(xmp("digitalCapture"))).aiDeclared).toBe(false)
  })
  it("reads the generator from C2PA content credentials", () => {
    // JUMBF box label + a CBOR map entry claim_generator -> "Adobe_Firefly/2.0" (0x70 = text of length 16)
    const c2pa = Buffer.concat([Buffer.from("jumbjumdc2pa\0", "latin1"), Buffer.from("claim_generator", "latin1"), Buffer.from([0x70]), Buffer.from("Some_Tool/2.0 x1", "latin1"), xmp("trainedAlgorithmicMedia")])
    expect(scanProvenance(file(c2pa))).toEqual({ hasContentCredentials: true, aiDeclared: true, composite: false, source: "Some Tool/2.0 x1" })
  })
  it("prefers a well-known tool name when one is present", () => {
    expect(scanProvenance(file(xmp("trainedAlgorithmicMedia", 'xmp:CreatorTool="Adobe Firefly"'))).source).toBe("Adobe Firefly")
  })
  it("content credentials without an AI declaration (e.g. a C2PA camera) are not flagged", () => {
    expect(scanProvenance(file(Buffer.from("jumbjumdc2pa\0c2pa.actions c2pa.created digitalCapture", "latin1")))).toMatchObject({ hasContentCredentials: true, aiDeclared: false })
  })
})
