import CloudinaryMark from "@/components/CloudinaryMark"
import { Eyebrow } from "@/components/ui/layout"
import { scriptsIn, textLines, type PhotoText as Text } from "@/lib/ocr-parse"

const languageName = (code: string | null) => {
  if (!code || code === "und") return null
  try { return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? null } catch { return null }
}
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`)

// Words Cloudinary's OCR add-on read in the photo: signboards, plot numbers, banners. Searchable from /search.
// Short texts are shown line by line, as on the sign; long ones (street scenes) as compact pieces so they never
// turn into a tall column.
export default function PhotoText({ text }: { text: Text }) {
  if (!text.text) return null
  const lines = textLines(text.text)
  const scripts = scriptsIn(text.text)
  // OCR reports ONE locale even for mixed signs: only name the language when it cannot be misleading.
  const lang = languageName(text.locale)
  const showLang = lang && !(text.locale === "en" && scripts.some((s) => s !== "Latin"))
  const label = ["Read by Cloudinary", showLang ? lang : null, scripts.length ? `${list(scripts)} script` : null].filter(Boolean).join(" · ")
  return (
    <section className="grid gap-4" aria-labelledby="ocr-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Words in the photo</Eyebrow>
        <CloudinaryMark says="Read by Cloudinary's text detection add-on (OCR); searchable" />
      </div>
      <h2 id="ocr-h" className="sr-only">Words in the photo</h2>
      {lines.length <= 4 ? (
        <p lang={text.locale ?? undefined} className="whitespace-pre-line rounded-md border border-line bg-surface-1 p-4 text-[17px] leading-7">{lines.join("\n")}</p>
      ) : (
        <ul lang={text.locale ?? undefined} className="flex list-none flex-wrap gap-1.5 rounded-md border border-line bg-surface-1 p-3" aria-label={`${lines.length} pieces of text`}>
          {lines.map((l, i) => <li key={i} className="rounded-sm border border-line-strong px-2 py-0.5 text-[15px] leading-6">{l}</li>)}
        </ul>
      )}
      <p className="text-small">{label}. Search for any of these words to find this photo.</p>
    </section>
  )
}
