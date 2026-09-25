import { SealMark } from "@/components/shell/Wordmark"

// Public, read-only pages (QR target and shared story): no app navigation, a minimal header (DESIGN.md 8.8 / 8.9).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-[52px] max-w-[880px] items-center gap-2.5 px-4 md:px-6">
          <SealMark />
          <span className="font-heading text-[15px] font-[650] leading-none">Overlook</span>
          <span className="text-small">· Public evidence page</span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-24 pt-8 md:px-6">{children}</main>
    </>
  )
}
