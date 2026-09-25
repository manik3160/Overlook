import Link from "next/link"

// The 10 rows of the PS mapping (README.md). Every "See it" link goes to a real route.
export default function BriefLedger({ project, report }: { project: string; report: string }) {
  const rows: [string, string, string, string][] = [
    ["Analyze large collections of image and video", "Direct-to-Cloudinary upload, background analysis with progress, key frames from video", "/upload", "Upload"],
    ["Organize by project, location and timeline", "Projects suggested from GPS and time, map with geofence, day-by-day timeline", project, "Project"],
    ["Identify activities, locations and visual signals", "12-tag taxonomy, 6 countable signals, photo and video GPS", "/dashboard", "Overview"],
    ["Verify, and give reliable insights", "Trust score with explainable flags, human review queue", "/review", "Review"],
    ["Search by AI metadata and meaning", "Semantic search plus tag, trust, date and type filters, and spoken words in video", "/search", "Search"],
    ["Compare before and after", "Automatic pairing, slider, written change summary", project, "Project"],
    ["Measure impact", "Scorecard where every number opens its photos", project, "Project"],
    ["Produce visual reports and summaries", "Donor and CSR PDF with scorecard, pairs and evidence table", project, "Project"],
    ["Keep traceability to originals and transformations", "Manifest with public_ids and transformation URLs, SHA-256, QR to a public page", report, "Verify"],
    ["Create campaign-ready content and stories", "Instagram, story and Hindi WhatsApp cards with faces pixelated, public story page", project, "Project"],
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead><tr className="text-eyebrow border-b border-line"><th className="pb-2.5 pr-6 font-medium">The brief asks to</th><th className="pb-2.5 pr-6 font-medium">What Overlook does</th><th className="pb-2.5 font-medium">See it</th></tr></thead>
        <tbody>
          {rows.map(([a, b, href, label]) => (
            <tr key={a} className="border-b border-line align-top">
              <td className="w-[34%] py-3.5 pr-6 text-[15px] font-semibold">{a}</td>
              <td className="text-small py-3.5 pr-6">{b}</td>
              <td className="whitespace-nowrap py-3.5"><Link href={href} className="text-[13px] text-accent-ink hover:underline">{label} →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
