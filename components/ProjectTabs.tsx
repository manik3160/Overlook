import Link from "next/link"
import { cn } from "@/lib/utils"
import TabPending from "@/components/TabPending"

export const PROJECT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "before-after", label: "Before/after" },
  { id: "evidence", label: "Evidence" },
  { id: "reports", label: "Reports" },
  { id: "campaign", label: "Campaign" },
] as const
export type ProjectTab = (typeof PROJECT_TABS)[number]["id"]

export const toTab = (v: string | string[] | undefined): ProjectTab => {
  const s = Array.isArray(v) ? v[0] : v
  return (PROJECT_TABS.find((t) => t.id === s)?.id ?? "overview") as ProjectTab
}
export const tabHref = (projectId: string, tab: ProjectTab) => (tab === "overview" ? `/projects/${projectId}` : `/projects/${projectId}?tab=${tab}`)

// Real tabs (DESIGN.md 8.3): each is a server-rendered link, so views are linkable and the back button works.
// Sticky under the top bar; scrolls sideways on phones.
export default function ProjectTabs({ projectId, active, counts = {} }: { projectId: string; active: ProjectTab; counts?: Partial<Record<ProjectTab, number>> }) {
  return (
    <nav aria-label="Project views" className="sticky top-14 z-20 -mx-4 mb-10 overflow-x-auto border-b border-line bg-bg px-4 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
      <ul className="flex list-none gap-1 p-0">
        {PROJECT_TABS.map((t) => {
          const on = t.id === active
          const n = counts[t.id]
          return (
            <li key={t.id}>
              <Link
                href={tabHref(projectId, t.id)}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn("relative flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium text-fg-2 shadow-[inset_0_-2px_0_transparent] transition-colors hover:text-fg max-md:py-3.5", on && "text-fg shadow-[inset_0_-2px_0_var(--fg)]")}
              >
                {t.label}
                {n !== undefined && n > 0 && <span className="font-mono text-[10px] leading-none text-fg-3">{n}</span>}
                {!on && <TabPending />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
