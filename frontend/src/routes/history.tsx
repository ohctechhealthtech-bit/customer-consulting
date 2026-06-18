import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  History, 
  ShieldCheck, 
  Clock, 
  Settings, 
  User, 
  BadgeCheck, 
  XCircle,
  Calendar,
  Globe,
  Monitor,
  ArrowLeft,
  RefreshCcw
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PortalShell } from "@/components/portal/Shell";
import { BrandButton } from "@/components/portal/BrandButton";
import { getSession } from "@/lib/portal-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "My History — OHCTECH" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession();
    if (!s.token) {
      navigate({ to: "/" });
      return;
    }
    fetchHistoryData(s.token);
  }, []);

  const fetchHistoryData = async (token: string) => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/portal/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      toast.error("Failed to load history data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PortalShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <RefreshCcw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </PortalShell>
    );
  }

  const { consent, logins, profile } = data || {};

  return (
    <PortalShell>
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Activity History</h1>
            <p className="text-muted-foreground mt-1">Review your account activity and data consent logs.</p>
          </div>
          <BrandButton variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </BrandButton>
        </div>

        <Tabs defaultValue="consent" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1">
            <TabsTrigger value="consent" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <ShieldCheck className="mr-2 h-4 w-4" /> Consent
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <User className="mr-2 h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="logins" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Clock className="mr-2 h-4 w-4" /> Sign-ins
            </TabsTrigger>
          </TabsList>

          {/* Consent History Tab */}
          <TabsContent value="consent" className="mt-6">
            <HistoryCard 
              title="Consent Log" 
              description="A record of every time you granted, rejected, or withdrew data consent."
            >
              <div className="divide-y divide-slate-100">
                {consent?.length === 0 && (
                  <EmptyState message="No consent records found." />
                )}
                {consent?.map((h: any) => (
                  <HistoryItem key={h.id} date={h.performed_at}>
                    <div className="flex items-center gap-2">
                       <StatusBadge status={h.action} />
                       <span className="text-sm font-semibold text-slate-700">
                        {h.action === 'ACCEPT' ? 'Consent Granted' : (h.action === 'REJECT' ? 'Consent Rejected' : 'Consent Withdrawn')}
                       </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Action performed by: {h.performed_by}</p>
                  </HistoryItem>
                ))}
              </div>
            </HistoryCard>
          </TabsContent>

          {/* Profile Update History Tab */}
          <TabsContent value="profile" className="mt-6">
            <HistoryCard 
              title="Profile Updates" 
              description="Chronological record of when your personal information was updated or cleared."
            >
              <div className="divide-y divide-slate-100">
                {profile?.length === 0 && (
                  <EmptyState message="No profile updates recorded." />
                )}
                {profile?.map((h: any) => (
                  <HistoryItem key={h.id} date={h.performed_at}>
                    <p className="text-sm font-semibold text-slate-700">{h.description}</p>
                    <p className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full w-fit mt-2 font-medium">Verified Submission</p>
                  </HistoryItem>
                ))}
              </div>
            </HistoryCard>
          </TabsContent>

          {/* Login History Tab */}
          <TabsContent value="logins" className="mt-6">
            <HistoryCard 
              title="Sign-in Activity" 
              description="Review recent sessions and check for unrecognized devices or locations."
            >
              <div className="divide-y divide-slate-100">
                {logins?.length === 0 && (
                  <EmptyState message="No login history available." />
                )}
                {logins?.map((l: any) => (
                  <HistoryItem key={l.id} date={l.login_time}>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Monitor className="h-3.5 w-3.5" /> {l.browser || 'Unknown Browser'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Globe className="h-3.5 w-3.5" /> {l.ip_address || 'Unknown IP'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                         {l.device_type === 'mobile' ? '📱 Mobile' : '💻 Desktop'}
                      </div>
                    </div>
                  </HistoryItem>
                ))}
              </div>
            </HistoryCard>
          </TabsContent>
        </Tabs>
      </div>
    </PortalShell>
  );
}

function HistoryCard({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
}

function HistoryItem({ date, children }: { date: string, children: React.ReactNode }) {
  return (
    <div className="p-5 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {children}
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
             <Calendar className="h-3 w-3" />
             {new Date(date).toLocaleDateString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 font-medium">
             {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    ACCEPT: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    REJECT: 'bg-rose-50 text-rose-600 border-rose-100',
    WITHDRAW: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  const config = colors[status as keyof typeof colors] || 'bg-slate-50 text-slate-600 border-slate-100';

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-md ${config}`}>
      {status === 'ACCEPT' && <BadgeCheck className="inline h-3 w-3 mr-1" />}
      {status === 'REJECT' && <XCircle className="inline h-3 w-3 mr-1" />}
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
        <History size={24} />
      </div>
      <p className="mt-3 text-sm text-slate-400 font-medium">{message}</p>
    </div>
  );
}
