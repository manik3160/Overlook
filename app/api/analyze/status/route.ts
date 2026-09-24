import { NextResponse } from "next/server"
import { getCounts } from "@/lib/analysis"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ counts: await getCounts() })
}
