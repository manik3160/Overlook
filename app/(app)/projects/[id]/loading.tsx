import { PageSkeleton } from "@/components/Skeletons"

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid gap-8 lg:grid-cols-12" aria-hidden="true">
        <div className="skeleton h-72 lg:col-span-7" />
        <div className="skeleton h-72 lg:col-span-5" />
      </div>
    </PageSkeleton>
  )
}
