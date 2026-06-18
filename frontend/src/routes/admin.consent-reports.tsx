import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Download, TrendingUp, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout, StatCard } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/consent-reports")({
  head: () => ({ meta: [{ title: "Consent Reports — Login Console" }] }),
  component: ConsentReportsPage,
});

type ConsentStats = {
  total: number;
  accepted: number;
  rejected: number;
};

type ConsentTrendItem = {
  month: string;
  accepted: number;
  rejected: number;
};

type ConsentReportsData = {
  stats: ConsentStats;
  consentTrend: ConsentTrendItem[];
  consents: { consent: "Accepted" | "Rejected" }[];
};

function ConsentReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConsentReportsData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await adminFetch<ConsentReportsData>("/api/admin/consents");
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load consent reports");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Consent Reports">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading consent reports…</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Consent Reports">
        <div className="py-16 text-center text-sm text-red-500">{error || "No data available"}</div>
      </AdminLayout>
    );
  }

  const { stats, consentTrend } = data;
  const consentDistribution = [
    { name: "Accepted", value: stats.accepted },
    { name: "Rejected", value: stats.rejected },
  ];
  const total = stats.total || 1;
  const accepted = stats.accepted;
  const rejected = stats.rejected;

  return (
    <AdminLayout title="Consent Reports">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track consent acceptance trends and export regulatory reports.
        </p>
        <Button variant="outline" onClick={() => toast.success("Report exported (demo)")}>
          <Download className="mr-2 h-4 w-4" /> Export report
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total submissions" value={total} icon={TrendingUp} />
        <StatCard
          label="Accepted"
          value={`${accepted} (${Math.round((accepted / total) * 100)}%)`}
          tone="positive"
          icon={CheckCircle2}
        />
        <StatCard
          label="Rejected"
          value={`${rejected} (${Math.round((rejected / total) * 100)}%)`}
          tone="warning"
          icon={XCircle}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">Consent trend (12 months)</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={consentTrend}>
                <defs>
                  <linearGradient id="acc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rej" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="accepted"
                  stroke="#10b981"
                  fill="url(#acc)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  stroke="#f59e0b"
                  fill="url(#rej)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-semibold">Accepted vs rejected</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={consentDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                >
                  {consentDistribution.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#10b981" : "#f59e0b"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Monthly volume</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="accepted" stackId="a" fill="#1e3a8a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rejected" stackId="a" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
}