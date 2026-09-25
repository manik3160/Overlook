import { NextResponse } from "next/server"
import { recomputeTrust } from "@/lib/trust-db"

// Recomputes trust for every asset. Free: no AI calls.
export async function POST() {
  return NextResponse.json({ recomputed: await recomputeTrust() })
}
