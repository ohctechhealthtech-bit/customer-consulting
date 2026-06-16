import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Home } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { PortalShell } from "@/components/portal/Shell";
import { BrandButton } from "@/components/portal/BrandButton";
import { clearSession, getSession, type PortalSession } from "@/lib/portal-store";

export const Route = createFileRoute("/thank-you")({
  head: () => ({ meta: [{ title: "Thank you — OHCTECH" }] }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const navigate = useNavigate();
  const [session, setS] = useState<PortalSession>({});

  useEffect(() => {
    const s = getSession();
    if (!s.referenceNumber) {
      navigate({ to: "/" });
      return;
    }
    setS(s);
  }, [navigate]);


  const goHome = () => {
    clearSession();
    navigate({ to: "/" });
  };

  return (
    <PortalShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-lg rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-white shadow-brand">
                  <CheckCircle2 className="h-7 w-7" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight">Submission Successful</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Your information has been received. A confirmation copy is available below.
              </p>
            </div>

            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Reference Number
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-foreground">
                    {session.referenceNumber}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Submission Date
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {session.submittedAt &&
                      new Date(session.submittedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Consent Status
                  </div>
                  <div
                    className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      session.consent === "allow"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {session.consent === "allow" ? "Allowed" : "Declined"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <BrandButton onClick={goHome}>
                <Home className="h-4 w-4" /> Return Home
              </BrandButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}