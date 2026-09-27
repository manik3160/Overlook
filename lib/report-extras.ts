// The two Cloudinary checks shown per photo in reports: what Cloudinary read INSIDE the stored file, and the words it
// read IN the photo. PURE (tested). The PDF uses built-in Latin fonts, so it only prints Latin-script words and names the
// other scripts; the verification page (a web page) shows everything.
export type FileCheck = { gps: boolean; time: boolean; mismatch: boolean }
export type PhotoWords = { text: string; scripts: string[] }

export function fileCheckLine(fc: FileCheck | undefined): string | null {
  if (!fc) return null
  if (fc.mismatch) return "Cloudinary read the file: location/time sent does NOT match it"
  if (!fc.gps && !fc.time) return "Cloudinary read the file: no location or time inside"
  return `Cloudinary read the file: ${fc.gps && fc.time ? "GPS and time" : fc.gps ? "GPS" : "time"} inside, consistent`
}

const PRINTABLE_ASCII = /^[\x20-\x7E]+$/

export function pdfWords(w: PhotoWords | undefined, max = 90): { latin: string | null; otherScripts: string[] } | null {
  if (!w?.text) return null
  const lines = w.text.split("\n").map((l) => l.trim()).filter((l) => PRINTABLE_ASCII.test(l) && /[A-Za-z0-9]/.test(l))
  const joined = lines.join(" / ")
  const latin = joined ? (joined.length > max ? `${joined.slice(0, max - 3).trimEnd()}...` : joined) : null
  return { latin, otherScripts: w.scripts.filter((s) => s !== "Latin") }
}
