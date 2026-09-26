import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// DESIGN.md 7.1. Primary is ink (not blue): blue is reserved for provenance and focus.
const buttonCva = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border border-transparent text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color] duration-[120ms] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink active:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-fg bg-fg text-bg hover:bg-[color-mix(in_srgb,var(--fg)_86%,var(--bg))]",
        outline: "border-line-strong bg-transparent text-fg hover:bg-surface-2 active:bg-surface-3",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg active:bg-surface-3",
        approve: "border-verified text-verified hover:bg-verified-tint",
        reject: "border-suspicious text-suspicious hover:bg-suspicious-tint",
        link: "h-auto border-0 px-0 text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink",
        onblue: "border-[#5B78B8] text-cy-fg hover:bg-[#1A3B7B]",
        paper: "border-paper bg-paper text-cy hover:bg-white",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5 text-[12.5px]",
        lg: "h-11 px-[18px] text-[15px]",
        icon: "size-8 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

// Always merge: the base `border-transparent` and a variant's border colour otherwise both land on the element, and
// the transparent one can win. That made outline links (e.g. "Field camera") render with no border.
export const buttonVariants = (props?: Parameters<typeof buttonCva>[0]) => cn(buttonCva(props))

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonCva>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button }
