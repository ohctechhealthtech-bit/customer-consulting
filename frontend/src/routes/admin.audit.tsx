import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — Login Console" }] }),
  component: AuditPage,
});

type AuditRecord = {
  id: string;
  event: string;
  user: string;
  timestamp: string;
  description: string;
};

type AuditResponse = {
  logs: AuditRecord[];
  eventTypes: string[];
  pagination: { page: number; limit: number };
};

function AuditPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuditResponse | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (q) params.set("search", q);
      if (type !== "all") params.set("event", type);
      if (range) params.set("days", range);
      const result = await adminFetch<AuditResponse>(`/api/admin/audit-logs?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [q, type, range]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const rows = data?.logs ?? [];
  const types = useMemo(() => data?.eventTypes ?? [], [data?.eventTypes]);

  return (
    <AdminLayout title="Audit Logs">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search logs…"
              className="h-10 pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-10 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-10 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading audit logs…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {a.event}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{a.user}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(a.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.description}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No audit events match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}