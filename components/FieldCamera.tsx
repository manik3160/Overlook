"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"
import { exportPublicKey, sha256Hex, signPayload, type CapturePayload } from "@/lib/capture"
import { getDeviceKey } from "@/lib/device-key"
import { haversineM } from "@/lib/geo"
import { uploadToCloudinary } from "@/lib/upload-client"

export type Ghost = { id: string; url: string; lat: number | null; lng: number | null; takenAt: string | null }
type Fix = { lat: number; lng: number; accuracyM: number; at: number }
type Saved = { id: string; score: number | null; flags: string[]; preview: string }

const FRESH_FIX_MS = 60_000
const REFRESH_NONCE_MS = 4 * 60_000 // nonces live 10 min; keep one well inside that
const RECENT_FILE_MS = 3 * 60_000 // fallback picker: the file must have been made just now

// Field camera with the Ghost overlay. The photo is hashed, signed on this device together with the live GPS
// fix and a fresh server nonce (lib/capture.ts), uploaded, and verified by /api/capture.
export default function FieldCamera({ projectId, projectName, ghost }: { projectId: string | null; projectName: string | null; ghost: Ghost | null }) {
  const video = useRef<HTMLVideoElement>(null)
  const nonce = useRef<string | null>(null)
  const fixRef = useRef<Fix | null>(null) // latest fix for async code; `fix` state is what the screen shows
  const [fix, setFix] = useState<Fix | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [opacity, setOpacity] = useState(45)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Saved | null>(null)

  const refreshNonce = useCallback(async () => {
    const res = await fetch("/api/capture/nonce", { method: "POST" })
    if (res.ok) nonce.current = (await res.json()).nonce
  }, [])

  useEffect(() => {
    void refreshNonce()
    const t = setInterval(() => void refreshNonce(), REFRESH_NONCE_MS)
    const watch = navigator.geolocation?.watchPosition(
      (p) => {
        const f = { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy), at: Date.now() }
        fixRef.current = f
        setFix(f)
      },
      (e) => setError(`Location: ${e.message}. Turn location on for this site.`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    )
    let stream: MediaStream | null = null
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        stream = s
        if (video.current) { video.current.srcObject = s; void video.current.play() }
        setCameraOn(true)
      })
      .catch(() => setCameraOn(false)) // no camera or permission denied: the file picker below still works
    return () => {
      clearInterval(t)
      if (watch !== undefined) navigator.geolocation.clearWatch(watch)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [refreshNonce])

  const distance = ghost?.lat != null && ghost.lng != null && fix ? Math.round(haversineM(fix, { lat: ghost.lat, lng: ghost.lng })) : null

  async function sign(blob: Blob, capturedAt: Date) {
    setError(null); setBusy(true); setSaved(null)
    try {
      const f = fixRef.current
      if (!f || Date.now() - f.at > FRESH_FIX_MS) throw new Error("Waiting for a fresh GPS fix. Stand still for a few seconds and try again.")
      if (!nonce.current) throw new Error("Not connected yet. Try again in a moment.")
      const used = nonce.current
      nonce.current = null // single use
      const payload: CapturePayload = { v: 1, sha256: await sha256Hex(await blob.arrayBuffer()), lat: f.lat, lng: f.lng, accuracyM: f.accuracyM, capturedAt: capturedAt.toISOString(), nonce: used, projectId, ghostAssetId: ghost?.id ?? null }
      const pair = await getDeviceKey()
      const [signature, publicKey] = [await signPayload(pair.privateKey, payload), await exportPublicKey(pair)]
      const up = await uploadToCloudinary(blob, `evidence/${projectId ?? "inbox"}`)
      const res = await fetch("/api/capture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, signature, publicKey, upload: { public_id: up.public_id, asset_id: up.asset_id, secure_url: up.secure_url, etag: up.etag, phash: up.phash ?? null, width: up.width, height: up.height } }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Capture failed")
      setSaved({ id: body.asset.id, score: body.asset.trust_score, flags: (body.asset.trust_flags ?? []).map((x: { code: string }) => x.code), preview: URL.createObjectURL(blob) })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed")
    } finally {
      setBusy(false)
      void refreshNonce() // the used nonce is gone: get the next one
    }
  }

  async function snap() {
    const v = video.current
    if (!v || !v.videoWidth) return setError("The camera is not ready yet.")
    const canvas = document.createElement("canvas")
    canvas.width = v.videoWidth; canvas.height = v.videoHeight
    canvas.getContext("2d")?.drawImage(v, 0, 0)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9))
    if (!blob) return setError("Could not read the camera frame.")
    await sign(blob, new Date())
  }

  async function fromPicker(file: File | undefined) {
    if (!file) return
    if (Date.now() - file.lastModified > RECENT_FILE_MS) return setError("That photo was not just taken. Use the camera, or take a new photo.")
    await sign(file, new Date(file.lastModified))
  }

  const gpsText = fix ? `GPS ±${fix.accuracyM} m` : "Waiting for GPS…"
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-h2">{ghost ? "Retake from the same spot" : "Take a signed photo"}</h1>
        <p className="text-small">{projectName ? `Project: ${projectName}` : "No project: it goes to the inbox."} · {gpsText}{distance !== null ? ` · ${distance} m from where the earlier photo was taken` : ""}</p>
      </div>

      <div className="relative aspect-[3/4] w-full overflow-hidden border border-line bg-surface-2">
        <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {ghost && <img src={ghost.url} alt="Earlier photo to line up with" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ opacity: opacity / 100 }} />}
        {!cameraOn && <p className="absolute inset-0 grid place-items-center p-6 text-center text-small">Camera not available. Use “Take photo” below.</p>}
      </div>

      {ghost && (
        <label className="text-small grid gap-1">
          Ghost overlay: {opacity}%
          <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} aria-label="Ghost overlay opacity" />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {cameraOn && <Button onClick={snap} disabled={busy}>{busy ? "Signing and uploading…" : "Capture"}</Button>}
        <label className="inline-flex cursor-pointer items-center rounded-md border border-line-strong px-3 py-2 text-sm">
          Take photo
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={(e) => { void fromPicker(e.target.files?.[0]); e.target.value = "" }} />
        </label>
      </div>

      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {saved && (
        <InlineNotice tone="success" action={<Link href={`/assets/${saved.id}`} className="text-accent-ink underline">Open evidence</Link>}>
          Saved and signed{saved.score !== null ? ` · trust ${saved.score}` : ""}{saved.flags.includes("CAPTURED_LIVE") ? " · captured live" : ""}. Location and time were recorded at capture.
        </InlineNotice>
      )}
      <p className="text-small text-fg-3">The photo, your GPS fix and the time are signed on this device. Faces are not blurred here; public pages pixelate them.</p>
    </div>
  )
}
