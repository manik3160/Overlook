import type { Metadata } from "next"
import FieldCamera, { type Ghost } from "@/components/FieldCamera"
import { EmptyState } from "@/components/ui/notice"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Field camera" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

// /capture?project=<id>&ghost=<assetId>: take a signed live photo, optionally lined up with an earlier one.
export default async function CapturePage(props: PageProps<"/capture">) {
  const sp = await props.searchParams
  const projectParam = one(sp.project)
  const ghostParam = one(sp.ghost)
  if ((projectParam && !UUID.test(projectParam)) || (ghostParam && !UUID.test(ghostParam))) return <EmptyState title="Field camera">This link is not valid.</EmptyState>

  let ghost: Ghost | null = null
  let projectId = projectParam ?? null
  if (ghostParam) {
    const { data } = await supabase.from("assets").select("id, secure_url, lat, lng, taken_at, project_id, resource_type").eq("id", ghostParam).maybeSingle()
    if (!data || data.resource_type !== "image") return <EmptyState title="Field camera">The photo to line up with was not found.</EmptyState>
    ghost = { id: data.id, url: data.secure_url.replace("/upload/", "/upload/c_limit,w_1200,f_jpg,q_auto/"), lat: data.lat, lng: data.lng, takenAt: data.taken_at }
    projectId = projectId ?? data.project_id
  }
  const { data: project } = projectId ? await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle() : { data: null }
  return <FieldCamera projectId={project?.id ?? null} projectName={project?.name ?? null} ghost={ghost} />
}
