import AppShell from "@/components/shell/AppShell"

export const dynamic = "force-dynamic"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell />
      <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-8 md:px-6 xl:px-8">{children}</main>
    </>
  )
}
