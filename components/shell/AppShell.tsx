import { Menu } from "lucide-react"
import Wordmark from "@/components/shell/Wordmark"
import NavLinks from "@/components/shell/NavLinks"
import SearchBox from "@/components/shell/SearchBox"
import ThemeToggle from "@/components/shell/ThemeToggle"
import { Sheet } from "@/components/ui/sheet"
import { supabase } from "@/lib/supabase"
import { computeStats, type Stats } from "@/lib/stats"

async function loadStats(): Promise<Stats | null> {
  try {
    const { data } = await supabase.from("assets").select("resource_type, status, parent_asset_id, trust_score, trust_flags, review_status")
    return computeStats(data ?? [])
  } catch {
    return null // the shell must still render if the database is unreachable; the page shows the real error
  }
}

// Top bar for every app route (DESIGN.md 6.1). Reads counts only: it never triggers analysis.
export default async function AppShell() {
  const stats = await loadStats()
  const review = stats?.awaitingReview ?? 0
  const running = !!stats && stats.pending > 0
  const pct = stats && stats.total ? Math.round((stats.analyzed / stats.total) * 100) : 0
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-7 px-4 md:px-6 xl:px-8">
        <Wordmark />
        <div className="hidden h-full md:block"><NavLinks reviewCount={review} /></div>
        <span className="flex-1" />
        <SearchBox className="hidden w-[260px] lg:block" />
        <ThemeToggle />
        <div className="md:hidden">
          <Sheet title="Menu" variant="ghost" size="icon" trigger={<><Menu size={16} strokeWidth={1.5} /><span className="sr-only">Menu</span></>}>
            <NavLinks reviewCount={review} vertical />
            <SearchBox className="mt-6" />
          </Sheet>
        </div>
      </div>
      {running && stats && (
        <div className="h-0.5 bg-line" title={`${stats.analyzed} of ${stats.total} analyzed`} role="progressbar" aria-label="Analysis progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full bg-accent-ink transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
      )}
    </header>
  )
}
