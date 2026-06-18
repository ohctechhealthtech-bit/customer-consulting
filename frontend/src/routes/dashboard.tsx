import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  AlertCircle
} from "lucide-react";
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
  ProfileHistoryRecord 
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
  SelectValue 
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

function PatientDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileHistory, setProfileHistory] = useState<ProfileHistoryRecord[]>([]);
  const [updating, setUpdating] = useState(false);

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
  }, []);

  const loadAllData = async (token: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardData(token),
        loadProfileHistory(token)
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (token: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/portal/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
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
        toast.success(action === "ACCEPT" ? "Consent granted successfully" : "Consent withdrawn successfully");
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

  const { profile, consent, logins } = data || {};
  const status = consent?.current?.consent_status;
  const isAccepted = status === "allow";

  return (
    <PortalShell>
      <div className="mx-auto max-w-5xl space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {profile?.name || "Patient"}</h1>
            <p className="text-muted-foreground mt-1">Manage your profile, consent, and account settings.</p>
          </div>
          <BrandButton variant="outline" onClick={handleLogout} className="w-fit">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </BrandButton>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
              <div className={`h-1.5 w-full ${isAccepted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Consent Status</h2>
                    <div className="mt-2 flex items-center gap-2">
                      {isAccepted ? (
                        <>
                          <BadgeCheck className="h-6 w-6 text-emerald-600" />
                          <span className="text-xl font-bold text-emerald-700">Active / Granted</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-6 w-6 text-amber-600" />
                          <span className="text-xl font-bold text-amber-700">
                             {status === 'withdrawn' ? 'Withdrawn' : (status === 'deny' ? 'Declined' : 'No Consent')}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-slate-500 max-w-md">
                      {isAccepted 
                        ? "Your data is currently being stored securely to facilitate your healthcare services."
                        : "Your data is not being stored. You must grant consent to use our clinical services."
                      }
                    </p>
                  </div>
                  {isAccepted ? (
                    <BrandButton 
                      variant="outline" 
                      onClick={() => handleConsentAction("WITHDRAW")}
                      className="border-amber-200 text-amber-600 hover:bg-amber-50"
                    >
                      Withdraw Consent
                    </BrandButton>
                  ) : (
                    <BrandButton onClick={() => handleConsentAction("ACCEPT")}>
                      Grant Consent
                    </BrandButton>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-emerald-600" /> Personal Profile
                </CardTitle>
                <BrandButton variant="outline" size="sm" onClick={handleEditClick} disabled={updating}>
                  <Edit2 className="mr-2 h-3 w-3" /> Edit Profile
                </BrandButton>
              </CardHeader>
              <CardContent className="p-6">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">{profile?.name || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">{profile?.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mobile</dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">{profile?.mobile || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">{profile?.age || "—"}</dd>
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded-lg">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase">Employment:</span>
                        <span className="ml-2 text-sm font-medium text-slate-700">
                          {profile?.companyName || "N/A"} {profile?.employeeCode ? `(${profile?.employeeCode})` : ""}
                        </span>
                      </div>
                    </div>
                  </dl>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-emerald-600" /> Consent History
                </CardTitle>
                <button 
                  onClick={() => navigate({ to: "/history" })}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  View Detailed History
                </button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {(consent?.history || []).length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm">No history records found.</div>
                  )}
                  {consent?.history?.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${h.action === 'ACCEPT' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{h.action}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(h.performed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">System Verified</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-emerald-600" /> Profile Update History
                </CardTitle>
                <CardDescription>Records of all changes made to your profile information.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {profileHistory.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-sm">
                       <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                       No profile updates recorded.
                    </div>
                  )}
                  {profileHistory.map((h) => (
                    <div key={h.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{h.fieldName}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-400 line-through">{h.oldValue || "—"}</span>
                            <ChevronRight size={10} className="text-slate-300" />
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{h.newValue || "—"}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500">{new Date(h.updatedAt).toLocaleDateString()}</p>
                          <p className="text-[9px] text-slate-400 uppercase">{new Date(h.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200 shadow-sm bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-emerald-400" /> Account Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <button 
                  onClick={() => navigate({ to: "/change-password" })}
                  className="flex w-full items-center justify-between rounded-xl bg-white/10 p-4 hover:bg-white/20 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold">Change Password</p>
                    <p className="text-[10px] text-white/50">Update your security credentials</p>
                  </div>
                  <ChevronRight size={16} className="text-white/40" />
                </button>
                
                <div className="p-4 rounded-xl border border-white/10 text-xs">
                  <p className="text-white/60">Last sign-in</p>
                  <p className="mt-1 font-medium text-emerald-400">
                    {logins && logins[0] ? new Date(logins[0].login_time).toLocaleString() : "Just now"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recent Logins</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {logins?.slice(0, 5).map((l: any) => (
                  <div key={l.id} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-700">{new Date(l.login_time).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-500">{l.browser || "Browser"} • {l.device_type || "Device"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
               <Edit2 className="h-6 w-6 text-emerald-600" /> Edit Profile
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Update your personal and professional information here.</p>
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
                      <Input placeholder="john@example.com" {...field} className="rounded-xl h-11" />
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
                        <Input type="number" placeholder="25" {...field} className="rounded-xl h-11" />
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
    </PortalShell>
  );
}
