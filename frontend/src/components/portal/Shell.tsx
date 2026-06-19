import { Link } from "@tanstack/react-router";
import { Activity, Check } from "lucide-react";
import type { ReactNode } from "react";

export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-14" : size === "sm" ? "h-9" : "h-11";
  return (
    <img 
      src="/ohctech-logo.png" 
      alt="OHCTECH" 
      className={`${dim} w-auto object-contain`} 
    />
  );
}

export function BrandMark({ subtitle = "CONSENT PORTAL" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-4">
      <BrandLogo size="md" />
      <div className="leading-tight border-l-2 border-slate-200 pl-4 h-8 flex flex-col justify-center">
        <div className="text-[16px] font-bold uppercase tracking-[0.22em] text-slate-800 whitespace-nowrap">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <BrandMark />
          </Link>
        </div>
      </header>
      <main className="w-full px-4 py-6 sm:px-6">{children}</main>
      <footer className="w-full px-4 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
        © {new Date().getFullYear()} OHCTECH · Patient Consent & Data Collection
      </footer>
    </div>
  );
}

export function Stepper({ step, steps }: { step: number; steps: string[] }) {
  return (
    <ol className="flex w-full items-center">
      {steps.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <li key={label} className="flex flex-1 items-center">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold transition-all ${
                  done
                    ? "bg-brand-gradient text-white"
                    : active
                      ? "bg-brand-gradient text-white shadow-brand ring-4 ring-emerald-100"
                      : "bg-white text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </div>
              <div
                className={`hidden text-xs font-semibold sm:block ${
                  active || done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-3 hidden h-px flex-1 sm:block ${
                  done ? "bg-brand-gradient" : "bg-slate-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}