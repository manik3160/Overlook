// OpenTimestamps (public, free, anchored in Bitcoin; nothing is bought or traded). PURE, Node crypto only.
// A calendar returns a "timestamp": steps (append / prepend / sha256) from our 32-byte report hash to a commitment,
// ending in an attestation: "pending" (calendar URL) until a Bitcoin block includes it, then "bitcoin" (block height).
// This file parses those proofs and builds a standard .ots file that anyone can check on opentimestamps.org.
import { createHash } from "node:crypto"

export const CALENDARS = ["https://a.pool.opentimestamps.org", "https://b.pool.opentimestamps.org"]
const TAG_PENDING = "83dfe30d2ef90c8e"
const TAG_BITCOIN = "0588960d73d71901"
// Standard detached-timestamp file header (magic bytes + major version 1), then sha256 op + the file digest.
const HEADER = Buffer.concat([Buffer.from("004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294", "hex"), Buffer.from([0x01])])

export type Attestation =
  | { type: "pending"; uri: string; commitment: string }
  | { type: "bitcoin"; height: number; commitment: string }
  | { type: "unknown"; tag: string; commitment: string }

class Reader {
  i = 0
  constructor(private b: Buffer) {}
  byte() { if (this.i >= this.b.length) throw new Error("truncated proof"); return this.b[this.i++] }
  bytes(n: number) { if (this.i + n > this.b.length) throw new Error("truncated proof"); const out = this.b.subarray(this.i, this.i + n); this.i += n; return out }
  varuint() { let v = 0, shift = 0, b: number; do { b = this.byte(); v += (b & 0x7f) * 2 ** shift; shift += 7 } while (b & 0x80); return v }
  varbytes() { return this.bytes(this.varuint()) }
  done() { return this.i >= this.b.length }
}

function apply(op: number, msg: Buffer, r: Reader): Buffer {
  switch (op) {
    case 0xf0: return Buffer.concat([msg, r.varbytes()]) // append
    case 0xf1: return Buffer.concat([r.varbytes(), msg]) // prepend
    case 0x08: return createHash("sha256").update(msg).digest()
    case 0x02: return createHash("sha1").update(msg).digest()
    case 0x03: return createHash("ripemd160").update(msg).digest()
    default: throw new Error(`unsupported proof step 0x${op.toString(16)}`)
  }
}

function parseItems(r: Reader, msg: Buffer, out: Attestation[]) {
  for (;;) {
    const tag = r.byte()
    const fork = tag === 0xff
    const item = fork ? r.byte() : tag
    if (item === 0x00) {
      const t = r.bytes(8).toString("hex")
      const payload = new Reader(r.varbytes())
      const commitment = msg.toString("hex")
      if (t === TAG_PENDING) out.push({ type: "pending", uri: payload.varbytes().toString("utf8"), commitment })
      else if (t === TAG_BITCOIN) out.push({ type: "bitcoin", height: payload.varuint(), commitment })
      else out.push({ type: "unknown", tag: t, commitment })
    } else {
      parseItems(r, apply(item, msg, r), out)
    }
    if (!fork) return
  }
}

// All attestations reachable from `digest` in a serialized timestamp (as returned by a calendar).
export function parseTimestamp(digest: Buffer, proof: Buffer): Attestation[] {
  const r = new Reader(proof)
  const out: Attestation[] = []
  parseItems(r, digest, out)
  if (!r.done()) throw new Error("trailing bytes in proof")
  return out
}

// A standard .ots file for `digest`, combining the calendars' proofs as forks of one timestamp.
export function otsFile(digest: Buffer, proofs: Buffer[]): Buffer {
  if (digest.length !== 32) throw new Error("digest must be 32 bytes (SHA-256)")
  if (proofs.length === 0) throw new Error("no proofs")
  const body = Buffer.concat(proofs.flatMap((p, i) => (i < proofs.length - 1 ? [Buffer.from([0xff]), p] : [p])))
  return Buffer.concat([HEADER, Buffer.from([0x08]), digest, body])
}

// Reads a .ots file back (used by tests and to double-check what we serve).
export function readOtsFile(file: Buffer): { digest: Buffer; attestations: Attestation[] } {
  if (!file.subarray(0, HEADER.length).equals(HEADER)) throw new Error("not an OpenTimestamps proof file")
  const r = new Reader(file.subarray(HEADER.length))
  if (r.byte() !== 0x08) throw new Error("only SHA-256 file hashes are supported")
  const digest = Buffer.from(r.bytes(32))
  return { digest, attestations: parseTimestamp(digest, file.subarray(HEADER.length + 33)) }
}

export const bitcoinHeight = (as: Attestation[]) => as.reduce<number | null>((h, a) => (a.type === "bitcoin" && (h === null || a.height < h) ? a.height : h), null)

const varuintBytes = (n: number) => { const out: number[] = []; do { let b = n & 0x7f; n = Math.floor(n / 128); if (n) b |= 0x80; out.push(b) } while (n); return Buffer.from(out) }
const varbytes = (b: Buffer) => Buffer.concat([varuintBytes(b.length), b])

// The serialized "pending at <uri>" attestation, exactly as calendars write it.
export const pendingBytes = (uri: string) => Buffer.concat([Buffer.from([0x00]), Buffer.from(TAG_PENDING, "hex"), varbytes(varbytes(Buffer.from(uri, "utf8")))])

// Once the calendar has anchored the commitment in Bitcoin it returns the rest of the path (from that commitment).
// A calendar proof is one chain ending in its pending attestation, so the upgrade simply replaces that ending.
export function mergeUpgrade(proof: Buffer, uri: string, upgraded: Buffer): Buffer | null {
  const tail = pendingBytes(uri)
  if (!proof.subarray(proof.length - tail.length).equals(tail)) return null // not a single chain: keep the pending proof
  return Buffer.concat([proof.subarray(0, proof.length - tail.length), upgraded])
}
