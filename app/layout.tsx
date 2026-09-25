import type { Metadata } from "next"
import { Funnel_Display, Funnel_Sans, Martian_Mono } from "next/font/google"
import "./globals.css"

const display = Funnel_Display({ subsets: ["latin"], variable: "--font-display" })
const sans = Funnel_Sans({ subsets: ["latin"], variable: "--font-body" })
const mono = Martian_Mono({ subsets: ["latin"], variable: "--font-data", axes: ["wdth"] })

export const metadata: Metadata = {
  title: { default: "Overlook", template: "%s · Overlook" },
  description: "Verified, searchable, measurable field evidence.",
}

// Runs before paint so there is no theme flash. Default is dark (Darkroom); no stored choice follows the OS.
const THEME_SCRIPT = `try{var t=localStorage.getItem("overlook-theme");var d=t?t==="dark":!window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* One shared filter: an unverified photo is shown as a cyanotype (DESIGN.md 4.9) */}
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
          <filter id="cyanotype" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.035 0.894" />
              <feFuncG type="table" tableValues="0.110 0.922" />
              <feFuncB type="table" tableValues="0.275 0.973" />
            </feComponentTransfer>
          </filter>
        </svg>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-fg focus:px-3 focus:py-2 focus:text-bg">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
