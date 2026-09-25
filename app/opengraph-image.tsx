import { ImageResponse } from "next/og"

export const alt = "Overlook: verified, searchable, measurable field evidence"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 96, background: "#0D0D0C", color: "#EDECE7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="96" height="96" viewBox="0 0 16 16">
            <rect x="1" y="1" width="14" height="14" fill="none" stroke="#EDECE7" strokeWidth="1.6" />
            <rect x="5.5" y="5.5" width="5" height="5" fill="#EDECE7" />
          </svg>
          <div style={{ fontSize: 96, fontWeight: 700 }}>Overlook</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 40, color: "#A8A69E" }}>Field evidence you can verify. Every photo scored, every number traceable, every report sealed.</div>
      </div>
    ),
    size,
  )
}
