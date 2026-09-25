"use client"

import "leaflet/dist/leaflet.css"
import { useEffect } from "react"
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"

export type MapPoint = { id: string; lat: number; lng: number; thumb: string; label: string; inside: boolean | null }
type Props = { center: { lat: number; lng: number } | null; radiusM: number; points: MapPoint[] }

function FitBounds({ center, radiusM, points }: Props) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
    if (center) bounds.extend(L.latLng(center.lat, center.lng).toBounds(radiusM * 2))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
  }, [map, center, radiusM, points])
  return null
}

export default function ProjectMap({ center, radiusM, points }: Props) {
  const start = center ?? points[0]
  if (!start) return <p className="text-sm">No location yet: set a center or add photos with GPS.</p>
  return (
    <MapContainer center={[start.lat, start.lng]} zoom={15} style={{ height: 400, width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {center && <Circle center={[center.lat, center.lng]} radius={radiusM} pathOptions={{ color: "#2563eb", fill: false }} />}
      {points.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={7} pathOptions={{ color: p.inside === false ? "#dc2626" : "#16a34a", fillOpacity: 0.8 }}>
          <Popup>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt="" width={120} height={120} />
            <div>{p.label}</div>
            <div>{p.inside === false ? "Outside geofence" : p.inside ? "Inside geofence" : ""}</div>
          </Popup>
        </CircleMarker>
      ))}
      <FitBounds center={center} radiusM={radiusM} points={points} />
    </MapContainer>
  )
}
