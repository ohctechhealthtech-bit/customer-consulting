import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/responses")({
  head: () => ({ meta: [{ title: "Responses — Admin Console" }] }),
  component: ResponsesPage,
});

type QuestionResponse = {
  questionKey: string;
  label: string;
  section: string;
  fieldType: string;
  value: string;
};

type ResponseCustomer = {
  id: number;
  reference: string;
  name: string;
  email: string;
  mobile: string;
  consent: "Accepted" | "Rejected";
  submittedAt: string;
  responses: QuestionResponse[];
};

type CustomersResponse = {
  customers: ResponseCustomer[];
  pagination: { limit: number };
};

function ResponsesPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomersResponse | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (q) params.set("search", q);
      const result = await adminFetch<CustomersResponse>(
        `/api/admin/customers-with-responses?${params.toString()}`,
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load responses");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const rows = data?.customers ?? [];

  return (
    <AdminLayout title="Questionnaire Responses">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search responses…"
              className="h-10 pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => toast.success("Export started (demo)")}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading responses…</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : (
          <Accordion type="single" collapsible className="mt-4">
            {rows.slice(0, 20).map((c) => (
              <AccordionItem key={c.reference} value={c.reference}>
                <AccordionTrigger className="text-sm">
                  <div className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                    </div>
                    <Badge variant={c.consent === "Accepted" ? "default" : "secondary"}>
                      {c.consent}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Reference", c.reference],
                      ["Mobile", c.mobile],
                      ["Submitted", new Date(c.submittedAt).toLocaleString()],
                      ...c.responses.map((r) => [r.label, r.value] as [string, string]),
                    ]
                      .filter(([, v]) => v != null && v !== "")
                      .map(([k, v]) => (
                        <div key={k}>
                          <div className="text-xs text-muted-foreground">{k}</div>
                          <div className="text-sm font-medium">{v}</div>
                        </div>
                      ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            ))}
            {rows.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No responses match your search.
              </div>
            )}
          </Accordion>
        )}
      </div>
    </AdminLayout>
  );
}