import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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

export const Route = createFileRoute("/admin/logins")({
  head: () => ({ meta: [{ title: "Login History — Login Console" }] }),
  component: LoginsPage,
});

type LoginRecord = {
  id: number;
  email: string;
  loginTime: string;
  logoutTime: string | null;
  ip: string;
  browser: string;
  os: string;
  device: string;
};

type LoginsResponse = {
  logins: LoginRecord[];
  pagination: { page: number; limit: number };
};

function LoginsPage() {
  const [q, setQ] = useState("");
  const [device, setDevice] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoginsResponse | null>(null);

  const fetchLogins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (q) params.set("search", q);
      if (device !== "all") params.set("device", device);
      const result = await adminFetch<LoginsResponse>(`/api/admin/login-history?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load login history");
    } finally {
      setLoading(false);
    }
  }, [q, device]);

  useEffect(() => {
    fetchLogins();
  }, [fetchLogins]);

  const rows = data?.logins ?? [];

  return (
    <AdminLayout title="Login History">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email or IP…"
              className="h-10 pl-9"
            />
          </div>
          <Select value={device} onValueChange={setDevice}>
            <SelectTrigger className="h-10 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All devices</SelectItem>
              <SelectItem value="Desktop">Desktop</SelectItem>
              <SelectItem value="Mobile">Mobile</SelectItem>
              <SelectItem value="Tablet">Tablet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading login history…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Logout</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l, i) => (
                  <TableRow key={l.id || i}>
                    <TableCell className="font-medium">{l.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(l.loginTime).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.logoutTime ? new Date(l.logoutTime).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.ip}</TableCell>
                    <TableCell>{l.browser}</TableCell>
                    <TableCell>{l.os}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{l.device}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No login records match your filters.
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