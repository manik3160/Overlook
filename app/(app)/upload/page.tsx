import type { Metadata } from "next"
import Uploader from "@/components/Uploader"
import AnalysisPanel from "@/components/AnalysisPanel"
import EvidenceTile, { TileGrid, type TileAsset } from "@/components/EvidenceTile"
import { Eyebrow, PageHeader, Section } from "@/components/ui/layout"
import { EmptyState, InlineNotice } from "@/components/ui/notice"
import { getCounts } from "@/lib/analysis"
import { supabase } from "@/lib/supabase"
import SampleSheet from "@/components/SampleSheet"
import { SAMPLE_MIX } from "@/components/landing/story-data"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Upload" }

export default async function UploadPage() {
  const { data, error } = await supabase
    .from("assets")
    .select("id, public_id, resource_type, secure_url, taken_at, lat, lng, status, tags, caption, trust_score, trust_flags, review_status, parent_asset_id, frame_second")
    .order("created_at", { ascending: false })
    .limit(200)
  const assets = (data ?? []) as TileAsset[]
  const counts = await getCounts()

  return (
    <>
      <PageHeader
        eyebrow="Evidence in"
        title={<><b className="font-semibold">Upload</b> &amp; analyze</>}
        lede={assets.length === 0 ? "Add photos and video. Location and time are read from each file before it leaves your device." : `${assets.length} file${assets.length === 1 ? "" : "s"} in the ledger, ${counts.done} analyzed.`}
        meta="Images up to 15 MB · videos up to 100 MB"
      />

      <div className="mb-16 grid gap-10 lg:grid-cols-12">
        <section aria-labelledby="up-h" className="grid content-start gap-5 lg:col-span-7">
          <div className="grid gap-2"><Eyebrow numbered>01 · Upload</Eyebrow><h2 id="up-h" className="text-h2">Add field evidence</h2></div>
          <Uploader />
        </section>
        <section aria-labelledby="an-h" className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
          <div className="mb-5 grid gap-2"><Eyebrow numbered>02 · Analysis</Eyebrow><h2 id="an-h" className="text-h2">Read what is in each photo</h2></div>
          <AnalysisPanel initial={counts} />
        </section>
      </div>

      <Section id="all" eyebrow="03 · All uploads" title={`${assets.length} asset${assets.length === 1 ? "" : "s"}`}>
        {error && <InlineNotice tone="error">Could not load assets: {error.message}</InlineNotice>}
        {assets.length === 0 && !error && (
          <EmptyState
            visual={<SampleSheet frames={SAMPLE_MIX} cols={4} edgeTop={["Sample roll", "illustrative"]} legend="Blue until analyzed" ariaLabel="Illustrative contact sheet showing how uploads look: blue until analyzed, colour once verified." />}
            title="No uploads yet"
          >
            Your files will appear here as a contact sheet. They stay blue until analyzed, turn to colour once verified, and get red marks if they are flagged for review.
          </EmptyState>
        )}
        <TileGrid>
          {assets.map((a) => <li key={a.id}><EvidenceTile asset={a} /></li>)}
        </TileGrid>
      </Section>
    </>
  )
}
