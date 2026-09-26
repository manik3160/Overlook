import { SealMark } from "@/components/shell/Wordmark"

// Field pages (phone camera): no app navigation, a minimal header.
export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-[52px] max-w-[640px] items-center gap-2.5 px-4">
          <SealMark />
          <span className="font-heading text-[15px] font-[650] leading-none">Overlook</span>
          <span className="text-small">· Field camera</span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[640px] flex-1 px-4 pb-16 pt-6">{children}</main>
    </>
  )
}
