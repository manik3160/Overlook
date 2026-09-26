// Which upload parameters the server will sign for a browser upload. PURE (tested).
// Without this, anyone could sign `public_id` + `overwrite` and replace an evidence original at the same URL.
export type SignCheck = { ok: true } | { ok: false; error: string }

const ALLOWED = new Set(["timestamp", "upload_preset", "folder", "phash", "image_metadata", "source"])
const MAX_SKEW_S = 10 * 60
const FOLDER = /^(evidence\/[A-Za-z0-9_-]{1,64}|registry-checks)$/

export function checkParamsToSign(params: Record<string, unknown>, opts: { preset: string | undefined; nowS: number }): SignCheck {
  const extra = Object.keys(params).filter((k) => !ALLOWED.has(k))
  if (extra.length) return { ok: false, error: `These upload settings are not allowed: ${extra.join(", ")}` }
  const ts = Number(params.timestamp)
  if (!Number.isFinite(ts) || Math.abs(opts.nowS - ts) > MAX_SKEW_S) return { ok: false, error: "timestamp missing or not within 10 minutes of now" }
  if (!opts.preset || params.upload_preset !== opts.preset) return { ok: false, error: "unknown upload preset" }
  if (typeof params.folder !== "string" || !FOLDER.test(params.folder)) return { ok: false, error: "folder must be evidence/<name> or registry-checks" }
  for (const k of ["phash", "image_metadata"] as const) {
    if (params[k] !== undefined && String(params[k]) !== "true" && params[k] !== true && params[k] !== 1 && String(params[k]) !== "1") return { ok: false, error: `${k} may only be true` }
  }
  if (params.source !== undefined && params.source !== "uw") return { ok: false, error: "unknown source" }
  return { ok: true }
}
