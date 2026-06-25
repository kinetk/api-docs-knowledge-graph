import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Minimal brand button — teal default that fills with the amber→gold gradient on
// hover, matching the KINETK design language. (Borrowed styling, not the website.)
const BASE =
  "cursor-pointer inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-6 py-3 text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 outline-none [&_svg]:shrink-0";

const VARIANTS = {
  default:
    "bg-[#26AEC0] text-white hover:bg-gradient-to-r hover:from-[#EEB248] hover:to-[#FFD700] hover:text-black",
  outline:
    "border border-kinetk-cyan text-kinetk-cyan bg-transparent hover:bg-gradient-to-r hover:from-[#EEB248] hover:to-[#FFD700] hover:text-black hover:border-[#EEB248]",
} as const;

function Button({
  className,
  variant = "default",
  disabled,
  isLoading,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isLoading?: boolean;
  variant?: keyof typeof VARIANTS;
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(BASE, VARIANTS[variant], className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button };
