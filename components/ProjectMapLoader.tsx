"use client"

import dynamic from "next/dynamic"

// Leaflet touches `window`, so the map only renders in the browser.
const ProjectMap = dynamic(() => import("@/components/ProjectMap"), { ssr: false, loading: () => <p className="text-sm">Loading map…</p> })
export default ProjectMap
