// Loading skeletons keep the same boxes as the real content so nothing jumps (DESIGN.md 8.10).
const Bar = ({ w, h = "h-4" }: { w: string; h?: string }) => <div className={`skeleton ${h} ${w}`} />

export function HeaderSkeleton() {
  return (
    <div className="mb-12 grid grid-cols-[minmax(0,1fr)] gap-3 border-b border-line pb-7" aria-hidden="true">
      <Bar w="w-20" h="h-3" /><Bar w="w-80 max-w-full" h="h-9" /><Bar w="w-[30rem] max-w-full" h="h-3.5" />
    </div>
  )
}

export function GridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-4 p-0" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <li key={i} className="skeleton aspect-square" />)}
    </ul>
  )
}

export function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading">
      <span className="sr-only">Loading</span>
      <HeaderSkeleton />
      {children ?? <GridSkeleton />}
    </div>
  )
}
