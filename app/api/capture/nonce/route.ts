import { NextResponse } from "next/server"
import { issueNonce } from "@/lib/capture-server"

export const dynamic = "force-dynamic"

// Step 1 of a signed capture: the phone asks for a fresh nonce when the camera opens. The photo must be
// taken and signed within 10 minutes of it, so it cannot have been made earlier and signed later.
export async function POST() {
  return NextResponse.json({ nonce: issueNonce(), issuedAt: Date.now() })
}
