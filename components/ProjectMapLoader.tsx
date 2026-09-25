"use client"

import dynamic from "next/dynamic"

// Leaflet touches `window`, so the map only renders in the browser.
const ProjectMap = dynamic(() => import("@/components/ProjectMap"), { ssr: false, loading: () => <div className="skeleton h-[300px] md:h-[420px]" role="status" aria-label="Loading map" /> })
export default ProjectMap
