import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  User,
  ShieldCheck,
  History,
  Settings,
  ChevronRight,
  LogOut,
  Calendar,
  Building2,
  BadgeCheck,
  XCircle,
  Clock,
  Edit2,
  LogIn,
  AlertCircle,
  Activity,
  Check,
  LayoutDashboard,
  Share2,
  Lock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  CartesianGrid as RechartsCartesianGrid,
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PortalShell } from "@/components/portal/Shell";
import { BrandButton } from "@/components/portal/BrandButton";
import { getSession, clearSession, setSession } from "@/lib/portal-store";
import {
  fetchProfile,
  updateProfile,
  fetchProfileHistory,
  ProfileData,
  ProfileUpdateGroup,
  ProfileChange,
} from "@/lib/api/portal-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CountryPhoneInput } from "@/components/portal/CountryPhoneInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  email: z.string().email("Invalid email address").max(255),
  mobile: z.string().min(7, "Mobile number is required").max(24),
  age: z.coerce.number().min(1, "Age must be at least 1").max(120),
  gender: z.string().optional(),
  companyName: z.string().optional(),
  employeeCode: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — OHCTECH" }] }),
  component: PatientDashboard,
});

type PortalDashboardData = {
  profile?: ProfileData;
  consent?: {
    current?: { consentStatus: string };
    history?: { id: number; action: string; performed_at: string }[];
  };
  logins?: { id: number; login_time: string; browser: string; device_type: string }[];
};

function PatientDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<PortalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileHistory, setProfileHistory] = useState<ProfileUpdateGroup[]>([]);
  const [updating, setUpdating] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [granting, setGranting] = useState(false);

  const { profile: rawProfile, consent, logins } = data || {};

  // Normalize name for display if firstName/lastName are missing (handle backend object structure)
  const profile = useMemo(() => {
    if (!rawProfile) return null;
    if (rawProfile.firstName) return rawProfile;

    // Split full name if only 'name' field exists
    const full = rawProfile.name || "";
    const parts = full.trim().split(/\s+/);
    return {
      ...rawProfile,
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || ""
    };
  }, [rawProfile]);

  const chartData = useMemo(() => {
    // Last 30 days map
    const dataMap: Record<
      string,
      { date: string; consentCount: number; loginCount: number; profileCount: number }
    > = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
      dataMap[key] = { date: key, consentCount: 0, loginCount: 0, profileCount: 0 };
    }

    // Fill counts
    if (consent?.history) {
      consent.history.forEach((h) => {
        const d = new Date(h.performed_at);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
        if (dataMap[key]) dataMap[key].consentCount += 1;
      });
    }

    if (logins) {
      logins.forEach((l) => {
        const d = new Date(l.login_time);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
        if (dataMap[key]) dataMap[key].loginCount += 1;
      });
    }

    if (profileHistory) {
      profileHistory.forEach((group) => {
        const d = new Date(group.updatedAt);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
        if (dataMap[key]) dataMap[key].profileCount += 1;
      });
    }

    return Object.values(dataMap);
  }, [consent?.history, logins, profileHistory]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      age: 0,
      gender: "",
      companyName: "",
      employeeCode: "",
    },
  });

  useEffect(() => {
    const s = getSession();
    if (!s.token) {
      navigate({ to: "/" });
      return;
    }

    loadAllData(s.token);

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = ["dashboard", "profile", "access-log", "history", "insights"];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const loadAllData = async (token: string) => {
    setLoading(true);
    try {
      await Promise.all([fetchDashboardData(token), loadProfileHistory(token)]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (token: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/portal/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    }
  };

  const loadProfileHistory = async (token: string) => {
    try {
      const history = await fetchProfileHistory(token);
      setProfileHistory(history);
    } catch (err) {
      console.error("Failed to load profile history", err);
    }
  };

  const handleWithdrawConsent = async () => {
    const s = getSession();
    if (!s?.token) return;

    setWithdrawing(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`,
        },
        body: JSON.stringify({ action: "WITHDRAW" }),
      });
      
      const json = await res.json();
      if (json.success) {
        toast.success("Consent withdrawn successfully. Your personal data has been purged.");
        setIsWithdrawModalOpen(false);
        // Refresh all data to show updated state
        await loadAllData(s.token);
      } else {
        throw new Error(json.message || "Failed to withdraw consent");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to withdraw consent");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleGrantConsent = async () => {
    const s = getSession();
    if (!s?.token) return;

    setGranting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`,
        },
        body: JSON.stringify({ action: "ACCEPT" }),
      });
      
      const json = await res.json();
      if (json.success) {
        toast.success("Consent granted! Your data processing authorization has been restored.");
        // Refresh all data to show updated state
        await loadAllData(s.token);
      } else {
        throw new Error(json.message || "Failed to grant consent");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to grant consent");
    } finally {
      setGranting(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEditClick = async () => {
    const s = getSession();
    if (!s.token) return;
    try {
      setUpdating(true);
      const profileData = await fetchProfile(s.token);
      form.reset({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        email: profileData.email || "",
        mobile: profileData.mobile || "",
        age: profileData.age || 0,
        companyName: profileData.companyName || "",
        employeeCode: profileData.employeeCode || "",
      });
      setIsEditModalOpen(true);
    } catch (err) {
      toast.error("Failed to load profile for editing");
    } finally {
      setUpdating(false);
    }
  };

  const onProfileSubmit = async (values: ProfileFormValues) => {
    const s = getSession();
    if (!s.token) return;
    setUpdating(true);
    try {
      const result = await updateProfile(values, s.token);
      toast.success(result.message || "Profile updated successfully");
      if (values.email !== s.email) setSession({ email: values.email });
      setIsEditModalOpen(false);
      await loadAllData(s.token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !data) {
    return (
      <PortalShell hideHeader={true} className="w-full px-4 pt-4 pb-12 sm:px-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Clock className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </PortalShell>
    );
  }

  return (
    <>
      <div className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white lg:flex z-50">
        <div className="flex shrink-0 flex-col px-8 pt-10 pb-10">
          <div className="mb-0 px-0">
            <img src="/ohctech-logo.png" alt="OHCTECH" className="h-12 w-auto object-contain" />
            <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-slate-400 pl-1">CONSENT PORTAL</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto custom-scrollbar pt-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'profile', label: 'Personal Profile', icon: User },
            { id: 'access-log', label: 'Access Log', icon: ShieldCheck },
            { id: 'history', label: 'Activity History', icon: History },
            { id: 'insights', label: 'Activity Insights', icon: Activity }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200 ${activeSection === item.id
                  ? 'bg-[#f0fdfa] text-[#0d9488] shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <item.icon size={20} className={activeSection === item.id ? 'text-[#0d9488]' : 'text-slate-400'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-4 pb-4">
          <button
            onClick={() => { clearSession(); navigate({ to: "/" }); }}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-all duration-200 group"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-transparent border border-rose-100 text-rose-500 group-hover:bg-rose-50 transition-colors">
              <LogOut size={16} />
            </div>
            Sign Out
          </button>
        </div>
      </div>

      <PortalShell hideHeader={true} className="w-full px-4 pt-10 pb-12 sm:px-8 lg:pl-80">
        <div className="mx-auto max-w-7xl pt-1">
          <div className="mb-0 flex items-center justify-between px-1 py-0.5">
            <div>
              <h1 className="text-[30px] font-bold tracking-tight text-[#1e293b]">Patient Portal</h1>
              <p className="text-[16px] text-slate-500 font-medium mt-1">Welcome back, <span className="text-[#14b8a6] font-semibold">{profile?.firstName || 'User'}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <button className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#0d9488] transition-colors relative">
                <ShieldCheck className="h-5 w-5" />
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white" />
              </button>
              <div className="flex items-center gap-4 bg-white border border-slate-200 pl-2 pr-6 py-1.5 rounded-2xl shadow-sm min-w-[200px]">
                <div className="h-8 w-8 rounded-xl bg-[#f0fdfa] border border-[#ccfbf1] text-[#0d9488] font-bold text-[11px] flex items-center justify-center shrink-0">
                  {profile?.firstName?.charAt(0) || "U"}
                </div>
                <div className="text-left leading-tight truncate">
                  <p className="text-[13px] font-semibold text-[#1e293b] truncate">{profile?.firstName} {profile?.lastName}</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Patient Profile</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <section id="dashboard" className="space-y-4 pt-8 scroll-mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { 
                    label: "CONSENT STATUS", 
                    value: consent?.current?.consentStatus === 'allow' ? 'Granted' : (consent?.current?.consentStatus === 'withdrawn' || consent?.current?.consentStatus === 'deny') ? 'Rejected' : 'Pending', 
                    icon: ShieldCheck, 
                    color: (consent?.current?.consentStatus === 'withdrawn' || consent?.current?.consentStatus === 'deny') ? 'rose' : consent?.current?.consentStatus === 'allow' ? 'teal' : 'slate' 
                  },
                  { 
                    label: "PROFILE UPDATED", 
                    value: profileHistory?.[0]?.updatedAt 
                      ? new Date(profileHistory[0].updatedAt).toLocaleDateString() 
                      : "Never", 
                    icon: History, 
                    color: "blue" 
                  },
                  { 
                    label: "ACTIVITY COUNT", 
                    value: `${profileHistory?.length || 0} Edits`, 
                    icon: Edit2, 
                    color: "slate" 
                  },
                  { 
                    label: "RECENT LOGIN", 
                    value: logins?.[0]?.login_time 
                      ? new Date(logins[0].login_time).toLocaleDateString() 
                      : "N/A", 
                    icon: LogIn, 
                    color: "teal" 
                  }
                ].map((stat, i) => (
                  <Card key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p>
                        <h3 className={`text-[22px] font-semibold tracking-tight ${stat.label === 'CONSENT STATUS' ? (stat.color === 'rose' ? 'text-rose-500' : stat.color === 'teal' ? 'text-[#0d9488]' : 'text-slate-500') : 'text-[#1e293b]'}`}>
                          {stat.value}
                        </h3>
                      </div>
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${stat.color === 'teal' ? 'bg-[#f0fdfa] text-[#0d9488]' : stat.color === 'rose' ? 'bg-rose-50 text-rose-500' : stat.color === 'blue' ? 'bg-[#eff6ff] text-[#2563eb]' : 'bg-[#f8fafc] text-slate-400 border border-slate-100'}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <Card className="rounded-[20px] border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                    <CardContent className="p-7">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-6 min-w-0">
                          <div className={`grid h-[60px] w-[60px] shrink-0 place-items-center rounded-2xl bg-[#ccfbf1] text-[#0d9488]`}>
                            <BadgeCheck className="h-8 w-8" />
                          </div>
                           <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">HEALTH INFORMATION CONSENT</div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[21px] font-medium tracking-tight text-[#1e293b]`}>
                                {consent?.current?.consentStatus === 'allow' ? 'Consent Granted' : (consent?.current?.consentStatus === 'withdrawn' || consent?.current?.consentStatus === 'deny') ? 'Consent Rejected' : 'Consent Pending'}
                              </span>
                              <div className={`h-2 w-2 rounded-full ${(consent?.current?.consentStatus === 'withdrawn' || consent?.current?.consentStatus === 'deny') ? 'bg-rose-500' : consent?.current?.consentStatus === 'allow' ? 'bg-[#14b8a6] animate-pulse' : 'bg-slate-300'}`} />
                            </div>
                            <p className="text-[14px] text-slate-500 font-medium mt-1 leading-relaxed">
                              {consent?.current?.consentStatus === 'allow' 
                                ? 'Authorized to store and process data for healthcare services.' 
                                : (consent?.current?.consentStatus === 'withdrawn' || consent?.current?.consentStatus === 'deny')
                                  ? 'Authorization revoked. Your data has been purged from active systems.'
                                  : 'Consent is required to proceed with healthcare data storage.'}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {consent?.current?.consentStatus !== 'allow' ? (
                            <BrandButton
                              onClick={handleGrantConsent}
                              disabled={granting}
                              className="h-10 px-6 bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl shadow-lg shadow-teal-100 transition-all font-bold text-[12px]"
                            >
                              {granting ? (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 animate-spin" />
                                  GRANTING...
                                </div>
                              ) : "Grant Consent"}
                            </BrandButton>
                          ) : (
                            <BrandButton
                              variant="outline"
                              onClick={() => setIsWithdrawModalOpen(true)}
                              className="h-10 px-5 text-[12px] font-semibold text-[#0d9488] border-[#bdfef0] hover:bg-[#f0fdfa] rounded-xl transition-all"
                            >
                              Withdraw Consent
                            </BrandButton>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-4">
                  <Card className="rounded-[20px] border border-slate-200 bg-white h-full shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                    <CardHeader className="px-6 py-4 border-b border-slate-100 bg-[#f8fafc]/30">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#0d9488]" />
                        <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">ACCOUNT PROTECTION</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 group cursor-pointer hover:bg-white hover:shadow-sm transition-all">
                        <div className="space-y-1">
                          <p className="text-[13px] font-semibold text-[#1e293b]">Secure Password</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">IDENTITY MANAGEMENT</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0d9488] transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            <section id="profile" className="space-y-6 scroll-mt-6">
              <div className="grid gap-6 lg:grid-cols-12">
                <Card className="lg:col-span-12 rounded-[22px] border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                  <CardHeader className="bg-[#f8fafc]/30 px-8 py-5 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#14b8a6] shadow-sm">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">IDENTITY PROFILE</p>
                          <p className="text-[16px] font-semibold text-[#1e293b]">Primary Information</p>
                        </div>
                      </div>
                      <BrandButton variant="outline" size="sm" onClick={handleEditClick} disabled={updating} className="h-9 px-5 text-[13px] font-bold rounded-xl hover:bg-[#f0fdfa] border-[#e2e8f0] text-[#0d9488]">
                        <Edit2 className="mr-2 h-4 w-4" /> EDIT DETAILS
                      </BrandButton>
                    </div>
                  </CardHeader>
                  <CardContent className="p-10">
                    <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
                      {[
                        { label: 'Full Name', value: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—' },
                        { label: 'Email Address', value: profile?.email },
                        { label: 'Mobile Number', value: profile?.mobile || '—' },
                        { label: 'Verification Context', value: profile?.companyName || 'Private Individual' }
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <dt className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">{item.label}</dt>
                          <dd className="text-[16px] font-semibold text-[#1e293b]">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </section>
            <section id="access-log" className="space-y-6 scroll-mt-6">
              <div className="grid gap-6 lg:grid-cols-12">
                <Card className="lg:col-span-12 rounded-[22px] border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col h-[400px]">
                  <CardHeader className="border-b border-slate-100 bg-[#f8fafc]/30 px-8 py-5 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#14b8a6] shadow-sm">
                        <ShieldCheck size={18} />
                      </div>
                      <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Security Access Log</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="divide-y divide-slate-100">
                      {logins?.map((l) => (
                        <div key={l.id} className="flex gap-5 items-center p-6 hover:bg-[#f8fafc]/50 transition-all">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-400 shadow-sm shrink-0">
                            <Clock size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-[#1e293b] truncate">{new Date(l.login_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight mt-1 truncate">{l.browser || 'System'} • {l.device_type || 'PC'}</p>
                          </div>
                        </div>
                      ))}
                      {(!logins || logins.length === 0) && (
                        <div className="p-16 text-center text-slate-400 italic text-sm col-span-full font-medium">No login attempts recorded.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>



            <section id="history" className="space-y-6 scroll-mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="rounded-[22px] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[480px]">
                  <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between px-8 py-5 sticky top-0 z-10 bg-white">
                    <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">PROFILE MODIFICATIONS</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="divide-y divide-slate-100">
                      {profileHistory.length === 0 && (
                        <div className="py-20 text-center text-[14px] text-slate-400 font-medium italic">No profile modifications found.</div>
                      )}
                      {profileHistory.map((group, idx) => (
                        <div key={idx} className="p-7 hover:bg-[#f8fafc]/30 transition-all">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-lg bg-[#f0fdfa] border border-[#ccfbf1] text-[#0d9488] font-bold text-[10px] flex items-center justify-center shadow-sm">
                                #{profileHistory.length - idx}
                              </div>
                              <p className="text-[13px] font-semibold text-[#1e293b]">Modification Recorded</p>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
                              {new Date(group.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="space-y-5">
                            {group.changes.map((ch: ProfileChange) => (
                              <div key={ch.id} className="space-y-2">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{ch.fieldName}</div>
                                <div className="flex items-center gap-3">
                                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg text-slate-400 text-xs font-semibold border border-slate-100 line-through">
                                    {ch.oldValue || "—"}
                                  </div>
                                  <ChevronRight size={12} className="text-slate-300" />
                                  <div className="bg-[#f0fdfa] px-3 py-1.5 rounded-lg text-[#0d9488] text-xs font-bold border border-[#ccfbf1] shadow-sm">
                                    {ch.newValue || "—"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[22px] border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col h-[480px]">
                  <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between px-8 py-5 sticky top-0 z-10 bg-white">
                    <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">CONSENT DIGITAL AUDIT</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="divide-y divide-slate-100">
                      {(consent?.history || []).length === 0 && (
                        <div className="py-20 text-center text-[14px] text-slate-400 font-medium italic">No activity recorded.</div>
                      )}
                      {consent?.history?.map((h: any) => (
                        <div key={h.id} className="p-7 hover:bg-[#f8fafc]/30 transition-all border-l-2 border-transparent hover:border-emerald-500">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${h.action === 'ACCEPT' ? 'bg-[#f0fdfa] text-[#0d9488] border border-[#ccfbf1]' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                                {h.action === 'ACCEPT' ? <Check size={18} strokeWidth={3} /> : <XCircle size={18} strokeWidth={3} />}
                              </div>
                              <div>
                                <p className="text-[14px] font-bold text-[#1e293b] leading-none tracking-tight">{h.action}</p>
                                <p className="text-[11px] text-slate-400 font-bold mt-1.5 uppercase tracking-[0.1em]">{new Date(h.performed_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-[#0d9488] bg-[#f0fdfa] px-3 py-1.5 rounded-lg border border-[#ccfbf1] uppercase tracking-widest shadow-sm">VERIFIED</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section id="insights" className="scroll-mt-6">
              <Card className="rounded-[24px] border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                <CardHeader className="border-b border-slate-100 px-8 py-5 bg-[#f8fafc]/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                      <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] leading-none">USAGE METRICS</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-2 w-2 rounded-full bg-[#14b8a6]" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ACTIVITY INSIGHTS</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorConsent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorLogin" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorProfile" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                          interval={4}
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis hide domain={[0, 'auto']} />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          iconType="circle"
                          iconSize={8}
                          content={({ payload }) => (
                            <div className="flex items-center justify-end gap-6 mb-8">
                              {payload?.map((entry: any, index: number) => (
                                <div key={`item-${index}`} className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid #f1f5f9',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '12px',
                            fontWeight: '700'
                          }}
                        />
                        <Area name="CONSENT ACTIVITY" type="monotone" dataKey="consentCount" stroke="#14b8a6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConsent)" />
                        <Area name="LOGIN ACTIVITY" type="monotone" dataKey="loginCount" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLogin)" />
                        <Area name="PROFILE UPDATE" type="monotone" dataKey="profileCount" stroke="#9333ea" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfile)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </PortalShell>

      {/* Edit Profile Modal (Functionality Preserved) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div className="bg-[#f8fafc] px-8 py-6 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-semibold text-[#1e293b]">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-[#0d9488] shadow-sm">
                  <Edit2 className="h-5 w-5" />
                </div>
                Edit Profile
              </DialogTitle>
              <p className="text-[14px] text-slate-500 font-medium mt-1">Update your personal and professional information here.</p>
            </DialogHeader>
          </div>

          <div className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} className="rounded-xl h-11 border-slate-100 focus:ring-[#14b8a6] focus:border-[#14b8a6] font-medium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} className="rounded-xl h-11 border-slate-100 focus:ring-[#14b8a6] focus:border-[#14b8a6] font-medium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} className="rounded-xl h-11 border-slate-100 focus:ring-[#14b8a6] focus:border-[#14b8a6] font-medium" />
                      </FormControl>
                      <FormMessage />
                      <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-2 font-semibold italic uppercase tracking-tight">
                        <AlertCircle size={12} /> Changing email will affect your future logins.
                      </p>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mobile Number</FormLabel>
                        <FormControl>
                          <CountryPhoneInput {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Age</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="25" {...field} className="rounded-xl h-11 border-slate-100 focus:ring-[#14b8a6] focus:border-[#14b8a6] font-medium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Inc." {...field} className="rounded-xl h-11 border-slate-100 focus:ring-[#14b8a6] focus:border-[#14b8a6] font-medium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employeeCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Employee Code</FormLabel>
                        <FormControl>
                          <Input placeholder="EMP123" {...field} className="rounded-xl h-11 border-slate-100 focus:ring-[#14b8a6] focus:border-[#14b8a6] font-medium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-8 border-t gap-3">
                  <BrandButton
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={updating}
                    className="rounded-xl h-11 px-8 font-semibold border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </BrandButton>
                  <BrandButton type="submit" disabled={updating} className="rounded-xl h-11 px-10 font-semibold shadow-brand">
                    {updating ? "Saving Changes..." : "Save Changes"}
                  </BrandButton>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Consent Withdrawal Confirmation Modal */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 border-none shadow-2xl">
          <div className="p-8">
            <DialogHeader className="mb-6">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
                <AlertCircle size={28} />
              </div>
              <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                Withdraw Consent?
              </DialogTitle>
              <div className="text-slate-500 font-medium mt-2 leading-relaxed">
                This action will revoke our authorization to process your health data. 
                <span className="text-rose-600 font-bold block mt-2">
                  Warning: All your personal information will be permanently purged from our active systems.
                </span>
              </div>
            </DialogHeader>
            
            <div className="flex flex-col gap-3">
              <BrandButton 
                onClick={handleWithdrawConsent}
                disabled={withdrawing}
                className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-[15px] shadow-lg shadow-rose-200"
              >
                {withdrawing ? (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    WITHDRAWING...
                  </div>
                ) : "YES, WITHDRAW AND PURGE DATA"}
              </BrandButton>
              <BrandButton 
                variant="outline"
                onClick={() => setIsWithdrawModalOpen(false)}
                disabled={withdrawing}
                className="w-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-[15px]"
              >
                CANCEL
              </BrandButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
