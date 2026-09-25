import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/layout"

export default function NotFound() {
  return (
    <main id="main" className="mx-auto grid w-full max-w-[880px] flex-1 content-start gap-5 px-4 py-16 md:px-6">
      <Eyebrow>404</Eyebrow>
      <h1 className="text-h1">Not <b className="font-semibold">found</b></h1>
      <p className="text-small max-w-[68ch]">That page, project, photo or report does not exist (or was removed).</p>
      <div><Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>Back to overview</Link></div>
    </main>
  )
}
