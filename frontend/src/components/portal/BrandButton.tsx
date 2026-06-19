import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
};

export const BrandButton = forwardRef<HTMLButtonElement, Props>(function BrandButton(
  { className, variant = "primary", size = "default", fullWidth, ...props },
  ref,
) {
  const sizeClasses = {
    default: "h-11 px-6 text-sm",
    sm: "h-9 px-4 text-xs",
    lg: "h-12 px-8 text-base",
  };

  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
        sizeClasses[size],
        fullWidth && "w-full",
        variant === "primary"
          ? "bg-brand-gradient text-white shadow-brand hover:opacity-95 active:opacity-90"
          : "border border-slate-200 bg-white text-foreground hover:bg-slate-50",
        className,
      )}
    />
  );
});
