import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Country = { code: string; dial: string; name: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "AE", dial: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SG", dial: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "CA", dial: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { code: "JP", dial: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "CN", dial: "+86", name: "China", flag: "🇨🇳" },
  { code: "BR", dial: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "NZ", dial: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "NP", dial: "+977", name: "Nepal", flag: "🇳🇵" },
  { code: "LK", dial: "+94", name: "Sri Lanka", flag: "🇱🇰" },
];

function formatNumber(dial: string, raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (dial === "+91" && digits.length > 5) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (dial === "+1" && digits.length > 6)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length > 4) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return digits;
}

export function CountryPhoneInput({
  value,
  onChange,
  defaultCountry = "IN",
}: {
  value: string;
  onChange: (v: string) => void;
  defaultCountry?: string;
}) {
  const initial =
    COUNTRIES.find((c) => value.startsWith(c.dial)) ??
    COUNTRIES.find((c) => c.code === defaultCountry) ??
    COUNTRIES[0];
  const [country, setCountry] = useState<Country>(initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const localPart = value.startsWith(country.dial) ? value.slice(country.dial.length).trim() : "";

  const setLocal = (raw: string) => {
    const formatted = formatNumber(country.dial, raw);
    onChange(formatted ? `${country.dial} ${formatted}` : country.dial);
  };

  const pickCountry = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setQuery("");
    onChange(localPart ? `${c.dial} ${localPart}` : c.dial);
  };

  return (
    <div className="flex h-11 w-full overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 border-r border-input bg-slate-50 px-3 text-sm font-medium hover:bg-slate-100"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-foreground">{country.dial}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search countries…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No countries found
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => pickCountry(c)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                    c.code === country.code && "bg-emerald-50/60",
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.dial}</span>
                  {c.code === country.code && (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      <input
        type="tel"
        inputMode="tel"
        placeholder="98765 43210"
        value={localPart}
        onChange={(e) => setLocal(e.target.value)}
        className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
