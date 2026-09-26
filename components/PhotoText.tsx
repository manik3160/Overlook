import CloudinaryMark from "@/components/CloudinaryMark"
import { Eyebrow } from "@/components/ui/layout"
import type { PhotoText as Text } from "@/lib/ocr-parse"

const languageName = (code: string | null) => {
  if (!code) return null
  try { return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code } catch { return code }
}

// Words Cloudinary's OCR add-on read in the photo: signboards, plot numbers, banners. Searchable from /search.
export default function PhotoText({ text }: { text: Text }) {
  if (!text.text) return null
  const lang = languageName(text.locale)
  return (
    <section className="grid gap-4" aria-labelledby="ocr-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Words in the photo</Eyebrow>
        <CloudinaryMark says="Read by Cloudinary's text detection add-on (OCR); searchable" />
      </div>
      <h2 id="ocr-h" className="sr-only">Words in the photo</h2>
      <p lang={text.locale ?? undefined} className="whitespace-pre-line rounded-md border border-line bg-surface-1 p-4 text-[17px] leading-7">{text.text}</p>
      <p className="text-small">Read by Cloudinary{lang ? ` (${lang})` : ""}. Search for any of these words to find this photo.</p>
    </section>
  )
}
