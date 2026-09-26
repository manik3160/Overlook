// Live donor pages: no app chrome at all, so the page can also be embedded in an iframe (?embed=1).
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-16 pt-6 md:px-6">{children}</main>
}
