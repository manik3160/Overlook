import { PageSkeleton } from "@/components/Skeletons"

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid gap-10 lg:grid-cols-12" aria-hidden="true">
        <div className="skeleton aspect-[4/3] lg:col-span-7" />
        <div className="skeleton h-96 lg:col-span-5" />
      </div>
    </PageSkeleton>
  )
}
