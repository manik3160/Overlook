// Sample "photos" drawn on canvas so the landing page needs no image files and spends no quota.
// They are illustrations of a riverbank cleanup, always labelled as samples in the UI.
export type SceneKind = "before" | "after" | "people" | "water" | "screen"

export function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => ((s = (s * 16807) % 2147483647), (s - 1) / 2147483646)
}

function scene(ctx: CanvasRenderingContext2D, w: number, h: number, kind: SceneKind, r: () => number) {
  const horizon = h * (0.3 + r() * 0.08)
  let g = ctx.createLinearGradient(0, 0, 0, horizon)
  g.addColorStop(0, "#aeb4b3"); g.addColorStop(1, "#d8d3c6")
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon)
  ctx.fillStyle = "#6f7466"
  ctx.beginPath(); ctx.moveTo(0, horizon)
  for (let x = 0; x <= w; x += w / 24) ctx.lineTo(x, horizon - 4 - r() * h * 0.05)
  ctx.lineTo(w, horizon); ctx.fill()
  g = ctx.createLinearGradient(0, horizon, 0, h)
  const ground = kind === "after" ? ["#8b7b62", "#6d5f49"] : ["#8a7458", "#5e4d3a"]
  g.addColorStop(0, ground[0]); g.addColorStop(1, ground[1])
  ctx.fillStyle = g; ctx.fillRect(0, horizon, w, h - horizon)
  if (kind === "water" || kind === "before" || kind === "after") {
    ctx.fillStyle = "#62777a"
    const wy = horizon + (h - horizon) * 0.08
    ctx.beginPath(); ctx.moveTo(0, wy)
    ctx.bezierCurveTo(w * 0.3, wy + h * 0.05, w * 0.6, wy - h * 0.02, w, wy + h * 0.03)
    ctx.lineTo(w, wy + h * 0.14)
    ctx.bezierCurveTo(w * 0.6, wy + h * 0.1, w * 0.3, wy + h * 0.16, 0, wy + h * 0.12); ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = Math.max(1, w / 400)
    for (let i = 0; i < 14; i++) { const y = wy + h * 0.02 + r() * h * 0.1, x = r() * w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * (0.04 + r() * 0.08), y); ctx.stroke() }
  }
  for (let i = 0; i < (w * h) / 90; i++) {
    const x = r() * w, y = horizon + r() * (h - horizon)
    ctx.fillStyle = r() > 0.5 ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.06)"
    ctx.fillRect(x, y, 1 + r() * 2 * (w / 320), 1 + r() * 2 * (w / 320))
  }
  const s = w / 320
  if (kind === "before") {
    const cols = ["#dcd6c8", "#3d6fb0", "#b8483c", "#ece6d4", "#2b2b2b", "#c99a3e", "#d7d7d7", "#7a3e8c"]
    for (let i = 0; i < 260; i++) {
      const y = horizon + (h - horizon) * (0.25 + Math.pow(r(), 0.7) * 0.75), x = r() * w
      ctx.fillStyle = cols[(r() * cols.length) | 0]
      ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 3); ctx.fillRect(0, 0, (2 + r() * 7) * s, (1.5 + r() * 4) * s); ctx.restore()
    }
    for (let i = 0; i < 10; i++) { ctx.fillStyle = "#526b39"; ctx.beginPath(); ctx.arc(r() * w, horizon + (h - horizon) * (0.3 + r() * 0.7), (2 + r() * 4) * s, 0, 7); ctx.fill() }
  }
  if (kind === "after") {
    for (let i = 0; i < 90; i++) {
      const y = horizon + (h - horizon) * (0.28 + r() * 0.72), rad = (3 + r() * 9) * s
      ctx.fillStyle = ["#4f7a3a", "#6b8f45", "#3e6630", "#7ea052"][(r() * 4) | 0]
      ctx.beginPath(); ctx.arc(r() * w, y, rad, 0, 7); ctx.fill()
    }
    ctx.fillStyle = "#a3927a"
    ctx.beginPath(); ctx.moveTo(w * 0.42, h); ctx.lineTo(w * 0.52, horizon + (h - horizon) * 0.3); ctx.lineTo(w * 0.56, horizon + (h - horizon) * 0.3); ctx.lineTo(w * 0.66, h); ctx.fill()
    for (let i = 0; i < 6; i++) { ctx.fillStyle = "#dcd6c8"; ctx.fillRect(r() * w, horizon + (h - horizon) * (0.4 + r() * 0.6), 2 * s, 1.5 * s) }
  }
  if (kind === "people") {
    for (let i = 0; i < 14; i++) { ctx.fillStyle = ["#dcd6c8", "#3d6fb0", "#b8483c", "#2b2b2b"][(r() * 4) | 0]; ctx.fillRect(r() * w, horizon + (h - horizon) * (0.4 + r() * 0.6), 3 * s, 2 * s) }
    const n = 4 + ((r() * 3) | 0)
    for (let i = 0; i < n; i++) {
      const x = w * (0.12 + (i * 0.78) / n) + r() * 10 * s, y = horizon + (h - horizon) * (0.35 + r() * 0.3), bh = (34 + r() * 14) * s
      ctx.fillStyle = "#2a2622"; ctx.fillRect(x, y, 12 * s, bh)
      ctx.fillStyle = r() > 0.35 ? "#e0782a" : "#3b4f7a"; ctx.fillRect(x - 1 * s, y + 4 * s, 14 * s, bh * 0.45)
      ctx.fillStyle = "#5a3d2b"; ctx.beginPath(); ctx.arc(x + 6 * s, y - 5 * s, 6 * s, 0, 7); ctx.fill()
    }
  }
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.35)")
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h)
}

export function paintScene(canvas: HTMLCanvasElement, kind: SceneKind, seed: number) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const w = canvas.width, h = canvas.height, r = rng(seed * 9973)
  if (kind === "screen") {
    ctx.fillStyle = "#4a4238"; ctx.fillRect(0, 0, w, h)
    const ix = w * 0.12, iy = h * 0.14, iw = w * 0.76, ih = h * 0.62
    ctx.fillStyle = "#111"; ctx.fillRect(ix - w * 0.03, iy - h * 0.03, iw + w * 0.06, ih + h * 0.06)
    ctx.save(); ctx.translate(ix, iy); ctx.beginPath(); ctx.rect(0, 0, iw, ih); ctx.clip()
    scene(ctx, iw, ih, "before", r)
    ctx.fillStyle = "rgba(255,255,255,.05)"; for (let y = 0; y < ih; y += 3) ctx.fillRect(0, y, iw, 1)
    ctx.fillStyle = "rgba(120,160,255,.12)"; ctx.fillRect(0, 0, iw, ih)
    ctx.restore()
    ctx.fillStyle = "#2a2520"; ctx.fillRect(w * 0.42, iy + ih + h * 0.03, w * 0.16, h * 0.1)
    return
  }
  scene(ctx, w, h, kind, r)
}
