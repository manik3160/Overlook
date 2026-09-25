"use client"

import SampleSheet from "@/components/SampleSheet"
import { HERO_FRAMES } from "@/components/landing/story-data"

// The landing hero's roll: 12 frames, 9 develop, 3 stay blue and get flagged.
export default function HeroContactSheet() {
  return (
    <SampleSheet
      frames={HERO_FRAMES}
      edgeTop={["Roll 01 · Yamuna ghat", "12 frames · sample"]}
      ariaLabel="Contact sheet of 12 sample field photos. Nine develop into colour once verified; three stay undeveloped and are flagged for review."
    />
  )
}
