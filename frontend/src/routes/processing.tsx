import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PortalShell } from "@/components/portal/Shell";
import { getSession } from "@/lib/portal-store";

export const Route = createFileRoute("/processing")({
  head: () => ({ meta: [{ title: "Submitting — OHCTECH" }] }),
  component: ProcessingPage,
});

function ProcessingPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const s = getSession();
    if (!s.consent) {
      navigate({ to: "/questionnaire" });
      return;
    }

    const interval = setInterval(() => {
      setProgress((p) => Math.min(100, p + 7 + Math.random() * 10));
    }, 220);

    const done = setTimeout(() => {
      navigate({ to: "/thank-you" });
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(done);
    };
  }, [navigate]);

  return (
    <PortalShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight">
              Submitting your information
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Please don't close this window. This usually takes a moment.
            </p>
            <div className="mt-6">
              <Progress value={progress} className="h-2" />
              <div className="mt-2 text-xs text-muted-foreground">{Math.floor(progress)}%</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}