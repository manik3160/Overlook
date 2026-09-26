// Declared-AI check. PURE. Generative AI tools increasingly label their output: C2PA content credentials
// (Adobe Firefly, OpenAI, Microsoft, Google...) and IPTC photo metadata both use the IPTC "digital source type"
// terms below. We look for those declarations in the file's bytes. Honest limit: this catches files that
// DECLARE AI (nobody fakes that to their own disadvantage); an AI image with its metadata stripped passes.
// We do not validate C2PA signatures: the flag says "declares", never "proven AI".

const AI_TERMS = ["compositeWithTrainedAlgorithmicMedia", "trainedAlgorithmicMedia"]
const KNOWN_SOURCES = ["Adobe Firefly", "DALL-E", "DALL·E", "ChatGPT", "OpenAI", "Midjourney", "Stable Diffusion", "Imagen", "Gemini", "Microsoft Designer", "Bing Image Creator", "Meta AI", "Leonardo"]
export const SCAN_BYTES = 4 * 1024 * 1024 // metadata sits near the start of JPEG/PNG/WebP/HEIC files

export type ProvenanceScan = { hasContentCredentials: boolean; aiDeclared: boolean; composite: boolean; source: string | null }

export function scanProvenance(bytes: Uint8Array): ProvenanceScan {
  const text = Buffer.from(bytes.subarray(0, SCAN_BYTES)).toString("latin1")
  const hasContentCredentials = text.includes("jumb") && text.includes("c2pa")
  const composite = text.includes(AI_TERMS[0])
  const aiDeclared = composite || text.includes(AI_TERMS[1])
  let source: string | null = null
  if (aiDeclared) {
    source = KNOWN_SOURCES.find((s) => text.includes(s)) ?? claimGenerator(text)
  }
  return { hasContentCredentials, aiDeclared, composite, source }
}

// C2PA's claim_generator is a CBOR text string right after its key: one header byte 0x60 + length (under 24),
// or 0x78 then a length byte. Read exactly that many bytes rather than guessing where the name ends.
function claimGenerator(text: string): string | null {
  const at = text.indexOf("claim_generator")
  if (at < 0) return null
  let i = at + "claim_generator".length
  const head = text.charCodeAt(i++)
  let len: number
  if (head >= 0x60 && head <= 0x77) len = head - 0x60
  else if (head === 0x78) len = text.charCodeAt(i++)
  else return null
  const name = text.slice(i, i + len).replace(/_/g, " ").trim()
  return /^[\x20-\x7e]{2,80}$/.test(name) ? name : null
}
