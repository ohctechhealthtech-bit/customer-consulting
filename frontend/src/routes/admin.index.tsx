import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, LogIn, Users, XCircle, FileCheck2, Loader2 } from "lucide-react";

import { AdminLayout, StatCard } from "@/components/admin/AdminLayout";
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

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Login Console" }] }),
  component: DashboardPage,
});

const COLORS = ["#1e3a8a", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

type DashboardSummary = {
  totalCustomers: number;
  todaysLogins: number;
  totalSubmissions: number;
  consentAcceptedPercent: number;
  consentRejectedPercent: number;
  accepted: number;
  rejected: number;
};

type DashboardCharts = {
  dailySubmissions: { date: string; submissions: number; accepted: number }[];
  consentDistribution: { name: string; value: number }[];
  deviceDistribution: { name: string; value: number }[];
  browserUsage: { name: string; value: number }[];
  consentTrend: { month: string; accepted: number; rejected: number }[];
};

type RecentCustomer = {
  name: string;
  email: string;
  consent: "Accepted" | "Rejected";
  reference: string;
};

type RecentLogin = {
  email: string;
  device: string;
  loginTime: string;
};

type DashboardData = {
  summary: DashboardSummary;
  charts: DashboardCharts;
  recentCustomers: RecentCustomer[];
  recentLogins: RecentLogin[];
};

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await adminFetch<DashboardData>("/api/admin/dashboard");
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading dashboard…</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Dashboard">
        <div className="py-16 text-center text-sm text-red-500">{error || "No data available"}</div>
      </AdminLayout>
    );
  }

  const { summary, charts, recentCustomers, recentLogins } = data;

  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total patients" value={summary.totalCustomers.toLocaleString()} icon={Users} />
        <StatCard label="Today's logins" value={summary.todaysLogins.toLocaleString()} icon={LogIn} />
        <StatCard
          label="Total submissions"
          value={summary.totalSubmissions.toLocaleString()}
          icon={FileCheck2}
        />
        <StatCard
          label="Consent accepted"
          value={`${summary.consentAcceptedPercent}%`}
          tone="positive"
          icon={CheckCircle2}
        />
        <StatCard
          label="Consent rejected"
          value={`${summary.consentRejectedPercent}%`}
          tone="warning"
          icon={XCircle}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Daily submissions" className="lg:col-span-2" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.dailySubmissions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="submissions"
                stroke="#1e3a8a"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="accepted"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Consent distribution" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={charts.consentDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
              >
                {charts.consentDistribution.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#10b981" : "#f59e0b"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Device distribution" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.deviceDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {charts.deviceDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Browser usage" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={charts.browserUsage} dataKey="value" nameKey="name" outerRadius={90}>
                {charts.browserUsage.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent patients">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCustomers.map((c) => (
                <TableRow key={c.reference}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>
                    <Badge variant={c.consent === "Accepted" ? "default" : "secondary"}>
                      {c.consent}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    No recent patients
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Panel>
        <Panel title="Recent logins">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogins.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{l.email}</TableCell>
                  <TableCell>{l.device}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(l.loginTime).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {recentLogins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    No recent logins
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </AdminLayout>
  );
}

function ChartCard({
  title,
  children,
  className,
  height = 240,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className ?? ""}`}>
      <div className="mb-3 text-sm font-semibold text-foreground">{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold">{title}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}