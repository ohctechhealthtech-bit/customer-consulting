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
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
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
    current?: { consent_status: string };
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

  const { profile, consent, logins } = data || {};

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.message);
      }
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

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  const handleEditClick = async () => {
    const s = getSession();
    if (!s.token) return;

    try {
      setUpdating(true);
      const profile = await fetchProfile(s.token);
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        mobile: profile.mobile || "",
        age: profile.age || 0,
        companyName: profile.companyName || "",
        employeeCode: profile.employeeCode || "",
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

      // If email was changed, update local session
      if (values.email !== s.email) {
        setSession({ email: values.email });
      }

      setIsEditModalOpen(false);
      await loadAllData(s.token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleConsentAction = async (action: "WITHDRAW" | "ACCEPT") => {
    try {
      setLoading(true);
      const s = getSession();
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`,
        },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          action === "ACCEPT" ? "Consent granted successfully" : "Consent withdrawn successfully",
        );
        await fetchDashboardData(s.token!);
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      toast.error("Failed to update consent");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <PortalShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Clock className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </PortalShell>
    );
  }

  const status = consent?.current?.consent_status;
  const isAccepted = status === "allow";

  return (
    <>
      <PortalShell>
        <div className="space-y-6 pb-12">
          {/* Header Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Patient Portal</h1>
              <p className="text-[13px] text-muted-foreground font-medium mt-0.5">
                Welcome back, {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Guest"}
              </p>
            </div>
            <BrandButton
              variant="outline"
              onClick={handleLogout}
              className="h-10 px-4 text-xs font-semibold"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
            </BrandButton>
          </div>
          {/* Statistics Summary Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Consent status
                  </div>
                  <div
                    className={`mt-1 text-xl font-bold tracking-tight ${isAccepted ? "text-emerald-600" : "text-amber-600"}`}
                  >
                    {isAccepted ? "Active" : status === "withdrawn" ? "Withdrawn" : "Missing"}
                  </div>
                </div>
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isAccepted ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                >
                  {isAccepted ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Profile updated
                  </div>
                  <div className="mt-1 text-xl font-bold tracking-tight text-foreground">
                    {profileHistory[0]
                      ? new Date(profileHistory[0].updatedAt).toLocaleDateString()
                      : "Initial"}
                  </div>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <History className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Activity count
                  </div>
                  <div className="mt-1 text-xl font-bold tracking-tight text-foreground">
                    {profileHistory.length} Edits
                  </div>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100">
                  <Edit2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Recent login
                  </div>
                  <div className="mt-1 text-xl font-bold tracking-tight text-foreground">
                    {logins && logins[0]
                      ? new Date(logins[0].login_time).toLocaleDateString()
                      : "Just now"}
                  </div>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <LogIn className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>{" "}
          <div className="grid gap-6">
            {/* Row 2: Consent & Security */}
            <div className="grid gap-6 lg:grid-cols-10">
              <div className="lg:col-span-7">
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
                  <div className={`h-1 w-full ${isAccepted ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-5 min-w-0">
                        <div
                          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${isAccepted ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-500"}`}
                        >
                          {isAccepted ? (
                            <BadgeCheck className="h-7 w-7" />
                          ) : (
                            <XCircle className="h-7 w-7" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] leading-none mb-2">
                            Health Information Consent
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xl font-bold tracking-tight ${isAccepted ? "text-slate-800" : "text-amber-700"}`}
                            >
                              {isAccepted
                                ? "Consent Granted"
                                : status === "withdrawn"
                                  ? "Withdrawn"
                                  : "Not Granted"}
                            </span>
                          </div>
                          <p className="text-[13px] text-slate-500 font-medium leading-none mt-2 truncate">
                            {isAccepted
                              ? "Authorized to store and process data for healthcare services."
                              : "Data processing is currently limited or restricted."}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isAccepted ? (
                          <BrandButton
                            variant="outline"
                            onClick={() => handleConsentAction("WITHDRAW")}
                            className="h-10 px-5 text-[11px] font-bold text-amber-600 border-amber-200 hover:bg-amber-50"
                          >
                            Withdraw Consent
                          </BrandButton>
                        ) : (
                          <BrandButton
                            onClick={() => handleConsentAction("ACCEPT")}
                            className="h-10 px-6 text-[11px] font-bold"
                          >
                            Grant Consent
                          </BrandButton>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-3">
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm h-full">
                  <CardHeader className="border-b border-slate-100 px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Settings className="h-4 w-4 text-emerald-600" /> Account Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <button
                      onClick={() => navigate({ to: "/change-password" })}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 hover:bg-slate-100 transition-colors group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700">Change Password</p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          Update account credentials
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-slate-400 group-hover:text-emerald-600 transition-all group-hover:translate-x-0.5"
                      />
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 3: Profile & Access Log */}
            <div className="grid gap-6 lg:grid-cols-10">
              <div className="lg:col-span-7">
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
                  <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <User className="h-4 w-4 text-emerald-600" /> Personal Profile
                    </CardTitle>
                    <BrandButton
                      variant="outline"
                      size="sm"
                      onClick={handleEditClick}
                      disabled={updating}
                      className="h-8 px-4 text-[11px] font-bold"
                    >
                      <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit Profile
                    </BrandButton>
                  </CardHeader>
                  <CardContent className="p-6">
                    <dl className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
                      <div className="space-y-1">
                        <dt className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Full Name
                        </dt>
                        <dd className="text-sm font-semibold text-slate-700">
                          {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "—"}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Email Address
                        </dt>
                        <dd className="text-sm font-semibold text-slate-700">{profile?.email}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Mobile Number
                        </dt>
                        <dd className="text-sm font-semibold text-slate-700">
                          {profile?.mobile || "—"}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Age
                        </dt>
                        <dd className="text-sm font-semibold text-slate-700">
                          {profile?.age || "—"} Years
                        </dd>
                      </div>
                      <div className="sm:col-span-2 mt-2 pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white border border-slate-100 text-slate-400">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-0.5">
                              Employment Verified
                            </span>
                            <span className="text-sm font-bold text-slate-700">
                              {profile?.companyName || "No Company Specified"}{" "}
                              {profile?.employeeCode ? `[${profile?.employeeCode}]` : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-3">
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[350px]">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 sticky top-0 z-10">
                    <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                      Access Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto flex-1">
                    <div className="divide-y divide-slate-100">
                      {logins?.map((l) => (
                        <div
                          key={l.id}
                          className="flex gap-4 items-center p-5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 border border-slate-100 text-slate-400 shrink-0">
                            <Clock size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-700 truncate">
                              {new Date(l.login_time).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-semibold truncate uppercase tracking-tighter">
                              {l.browser || "System"} • {l.device_type || "PC"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 4: History & Audit */}
            <div className="grid gap-6 lg:grid-cols-10">
              <div className="lg:col-span-7">
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[450px]">
                  <CardHeader className="border-b border-slate-100 flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-white">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Edit2 className="h-4 w-4 text-emerald-600" /> Profile Change History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto flex-1 bg-slate-50/10">
                    <div className="divide-y divide-slate-100">
                      {profileHistory.length === 0 && (
                        <div className="py-20 text-center text-[13px] text-muted-foreground font-medium italic">
                          No profile modifications found.
                        </div>
                      )}
                      {profileHistory.map((group, idx) => (
                        <div key={idx} className="p-6 hover:bg-white transition-all">
                          <div className="max-w-2xl">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="h-5 w-5 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
                                #{profileHistory.length - idx}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                                  Profile Updated
                                </p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                                  {new Date(group.updatedAt).toLocaleString(undefined, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3 pl-5 border-l border-slate-100 ml-2.5">
                              {group.changes.map((ch) => (
                                <div key={ch.id} className="group/item">
                                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                                    {ch.fieldName}
                                  </div>
                                  <div className="flex items-center gap-3 bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-100/50 w-fit">
                                    <span className="text-[11px] text-slate-400 line-through truncate max-w-[120px]">
                                      {ch.oldValue || "—"}
                                    </span>
                                    <ChevronRight size={10} className="text-slate-300 shrink-0" />
                                    <span className="text-[11px] font-bold text-emerald-600 truncate max-w-[180px]">
                                      {ch.newValue || "—"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-3">
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[450px]">
                  <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between px-6 py-4 sticky top-0 z-10 bg-white">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <History className="h-4 w-4 text-emerald-600" /> Consent Audit
                    </CardTitle>
                    <button
                      onClick={() => navigate({ to: "/history" })}
                      className="text-[11px] font-bold text-emerald-600 hover:underline uppercase tracking-widest"
                    >
                      Logs
                    </button>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto flex-1">
                    <div className="divide-y divide-slate-100">
                      {(consent?.history || []).length === 0 && (
                        <div className="py-20 text-center text-[13px] text-muted-foreground font-medium italic">
                          No activity recorded.
                        </div>
                      )}
                      {consent?.history?.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={`grid h-9 w-9 place-items-center rounded-full shrink-0 ${h.action === "ACCEPT" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                            >
                              {h.action === "ACCEPT" ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-slate-800 uppercase tracking-tight truncate">
                                {h.action}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-bold mt-0.5 uppercase tracking-tighter truncate opacity-70">
                                {new Date(h.performed_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 uppercase tracking-widest shrink-0">
                            Verified
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 5: Activity Timeline (Full Width) */}
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-[350px]">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between px-6 py-4 bg-slate-50/20">
                <CardTitle className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  <Activity className="h-4 w-4 text-emerald-600" /> Patient Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorConsent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLogin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProfile" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }}
                        interval={6}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                          fontSize: "10px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="consentCount"
                        name="Consent Activity"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorConsent)"
                        animationDuration={1500}
                      />
                      <Area
                        type="monotone"
                        dataKey="loginCount"
                        name="Login Activity"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorLogin)"
                        animationDuration={1500}
                      />
                      <Area
                        type="monotone"
                        dataKey="profileCount"
                        name="Profile Update Activity"
                        stroke="#a855f7"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorProfile)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PortalShell>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Edit2 className="h-6 w-6 text-emerald-600" /> Edit Profile
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Update your personal and professional information here.
            </p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} className="rounded-xl h-11" />
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} className="rounded-xl h-11" />
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="john@example.com"
                        {...field}
                        className="rounded-xl h-11"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 font-medium italic">
                      <AlertCircle size={10} /> Changing email will affect your future logins.
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
                      <FormLabel>Mobile Number</FormLabel>
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
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="25"
                          {...field}
                          className="rounded-xl h-11"
                        />
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
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Company Inc." {...field} className="rounded-xl h-11" />
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
                      <FormLabel>Employee Code</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP123" {...field} className="rounded-xl h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-6 border-t gap-2">
                <BrandButton
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={updating}
                  className="rounded-xl"
                >
                  Cancel
                </BrandButton>
                <BrandButton type="submit" disabled={updating} className="rounded-xl min-w-[120px]">
                  {updating ? "Saving Changes..." : "Save Changes"}
                </BrandButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
