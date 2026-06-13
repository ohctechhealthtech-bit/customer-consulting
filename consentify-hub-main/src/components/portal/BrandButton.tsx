import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
  fullWidth?: boolean;
};

export const BrandButton = forwardRef<HTMLButtonElement, Props>(function BrandButton(
  { className, variant = "primary", fullWidth, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
        fullWidth && "w-full",
        variant === "primary"
          ? "bg-brand-gradient text-white shadow-brand hover:opacity-95 active:opacity-90"
          : "border border-slate-200 bg-white text-foreground hover:bg-slate-50",
        className,
      )}
    />
  );
});
