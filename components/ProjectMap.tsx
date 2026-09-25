"use client"

import "leaflet/dist/leaflet.css"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/notice"
import { Sheet } from "@/components/ui/sheet"
import ProjectFormLazy from "@/components/ProjectForm"
import type { Project } from "@/lib/project-schema"

export type MapPoint = { id: string; lat: number; lng: number; thumb: string; label: string; inside: boolean | null; distanceM: number | null }
type Props = { center: { lat: number; lng: number } | null; radiusM: number; points: MapPoint[]; project?: Project }

// Leaflet needs literal colours, so read the design tokens and re-read when the theme class changes.
function useTokens() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const mo = new MutationObserver(() => setTick((t) => t + 1))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => mo.disconnect()
  }, [])
  return useMemo(() => {
    void tick
    const css = getComputedStyle(document.documentElement)
    const v = (n: string) => css.getPropertyValue(n).trim()
    return { accent: v("--accent-ink"), verified: v("--verified"), bad: v("--suspicious"), fg: v("--fg"), fg2: v("--fg-2"), bg: v("--bg") }
  }, [tick])
}

function FitBounds({ center, radiusM, points }: Omit<Props, "project">) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
    if (center) bounds.extend(L.latLng(center.lat, center.lng).toBounds(radiusM * 2))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
  }, [map, center, radiusM, points])
  return null
}

export default function ProjectMap({ center, radiusM, points, project }: Props) {
  const c = useTokens()
  const [list, setList] = useState(false)
  const start = center ?? points[0]
  if (!start) {
    return (
      <EmptyState title="No location yet" action={project ? <Sheet title="Edit project" trigger="Edit project" size="sm"><ProjectFormLazy mode="edit" projectId={project.id} submitLabel="Save changes" initial={project} /></Sheet> : undefined}>
        Set a centre or add photos with GPS.
      </EmptyState>
    )
  }
  const inside = points.filter((p) => p.inside === true).length
  const outside = points.filter((p) => p.inside === false).length
  const cross = L.divIcon({ className: "", iconSize: [12, 12], iconAnchor: [6, 6], html: `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 0v12M0 6h12" stroke="${c.fg}" stroke-width="1"/></svg>` })
  return (
    <div className="grid gap-3">
      <div className="h-[300px] border border-line md:h-[420px]">
        <MapContainer center={[start.lat, start.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {center && <Circle center={[center.lat, center.lng]} radius={radiusM} pathOptions={{ color: c.accent, weight: 1.5, dashArray: "4 4", fillColor: c.accent, fillOpacity: 0.06 }} />}
          {center && <Marker position={[center.lat, center.lng]} icon={cross} interactive={false} keyboard={false} />}
          {points.map((p) => (
            <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: c.bg, weight: 2, fillColor: p.inside === false ? c.bad : p.inside ? c.verified : c.fg2, fillOpacity: 1 }}>
              <Popup>
                <div className="grid w-[200px] gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt="" className="aspect-square w-full object-cover" />
                  <span className="text-data">{p.label}</span>
                  <span className="text-small">{p.inside === false ? "Outside geofence" : p.inside ? "Inside geofence" : "No geofence verdict"}</span>
                  <Link href={`/assets/${p.id}`} className="text-[13px] text-accent-ink underline underline-offset-[3px]">Open photo →</Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          <FitBounds center={center} radiusM={radiusM} points={points} />
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex list-none flex-wrap gap-x-5 gap-y-1 p-0" aria-label="Map legend">
          <li className="text-small flex items-center gap-2"><span className="size-2.5 rounded-full bg-verified" />Inside geofence <b className="font-mono text-fg">{inside}</b></li>
          <li className="text-small flex items-center gap-2"><span className="size-2.5 rounded-full bg-suspicious" />Outside <b className="font-mono text-fg">{outside}</b></li>
          {center && <li className="text-small flex items-center gap-2"><span className="size-2.5 rounded-full border border-dashed border-accent-ink" />Geofence {radiusM} m</li>}
        </ul>
        <Button variant="ghost" size="sm" onClick={() => setList((v) => !v)} aria-expanded={list}>{list ? "Hide list view" : "List view"}</Button>
      </div>
      {list && (
        <div className="max-h-72 overflow-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Photo locations</caption>
            <thead><tr className="text-eyebrow border-b border-line"><th className="pb-2 pr-3 font-medium">Time</th><th className="pb-2 pr-3 font-medium">From centre</th><th className="pb-2 pr-3 font-medium">Verdict</th><th className="pb-2 font-medium"><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="text-data py-2 pr-3">{p.label}</td>
                  <td className="text-data py-2 pr-3">{p.distanceM === null ? "–" : `${Math.round(p.distanceM)} m`}</td>
                  <td className="text-data py-2 pr-3">{p.inside === false ? "outside" : p.inside ? "inside" : "–"}</td>
                  <td className="py-2 text-right"><Link href={`/assets/${p.id}`} className="text-[13px] text-accent-ink hover:underline">Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
