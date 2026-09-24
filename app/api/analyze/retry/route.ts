import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getCounts } from "@/lib/analysis"

// Puts failed (and stuck "analyzing") images back in the queue. Cached steps are not re-billed.
export async function POST() {
  const { error } = await supabase
    .from("assets")
    .update({ status: "pending" })
    .in("status", ["failed", "analyzing"])
    .eq("resource_type", "image")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ counts: await getCounts() })
}
