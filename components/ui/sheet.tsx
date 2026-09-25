"use client"

import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import type { ReactNode } from "react"
import { buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Right-side sheet on desktop, bottom sheet on phones (DESIGN.md 7.18). Traps focus, Escape closes, focus returns to the trigger.
export function Sheet({ trigger, title, children, variant = "outline", size = "default", triggerClassName, side = "right" }: {
  trigger: ReactNode
  title: string
  children: ReactNode
  side?: "right" | "left"
  triggerClassName?: string
} & VariantProps<typeof buttonVariants>) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className={cn(buttonVariants({ variant, size }), triggerClassName)}>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-[320ms] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex flex-col border-line-strong bg-surface-1 shadow-[var(--shadow-pop)] outline-none transition-transform duration-[320ms] ease-[var(--ease-emph)]",
            // phones: bottom sheet, 90vh
            "inset-x-0 bottom-0 max-h-[90vh] rounded-t-md border-t data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
            // md+: side sheet
            side === "right"
              ? "md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[480px] md:rounded-none md:border-l md:border-t-0 md:data-[ending-style]:translate-x-full md:data-[ending-style]:translate-y-0 md:data-[starting-style]:translate-x-full md:data-[starting-style]:translate-y-0"
              : "md:inset-x-auto md:bottom-auto md:left-0 md:top-0 md:h-full md:max-h-none md:w-[480px] md:rounded-none md:border-r md:border-t-0 md:data-[ending-style]:-translate-x-full md:data-[ending-style]:translate-y-0 md:data-[starting-style]:-translate-x-full md:data-[starting-style]:translate-y-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <Dialog.Title className="text-h2">{title}</Dialog.Title>
            <Dialog.Close aria-label="Close" className={buttonVariants({ variant: "ghost", size: "icon" })}><X size={16} strokeWidth={1.5} /></Dialog.Close>
          </div>
          <div className="overflow-y-auto p-6">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
