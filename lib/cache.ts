import "server-only"
import { createHash } from "node:crypto"
import { supabase } from "@/lib/supabase"

// Every paid API call goes through here. If an `analyses` row exists for
// (asset, kind, hash(kind+asset+input)), the stored result is returned and fn is NOT called.
export async function cachedCall<T>(
  kind: string,
  assetId: string,
  input: unknown,
  fn: () => Promise<T>,
): Promise<{ result: T; cached: boolean }> {
  const inputHash = createHash("sha256").update(`${kind}|${assetId}|${JSON.stringify(input)}`).digest("hex")

  const { data: hit } = await supabase
    .from("analyses")
    .select("result")
    .eq("asset_id", assetId)
    .eq("kind", kind)
    .eq("input_hash", inputHash)
    .maybeSingle()
  if (hit) return { result: hit.result as T, cached: true }

  const result = await fn()
  await supabase
    .from("analyses")
    .upsert({ asset_id: assetId, kind, input_hash: inputHash, result }, { onConflict: "asset_id,kind,input_hash" })
  return { result, cached: false }
}
