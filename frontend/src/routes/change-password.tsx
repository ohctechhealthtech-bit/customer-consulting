import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Eye, EyeOff } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PortalShell } from "@/components/portal/Shell";
import { BrandButton } from "@/components/portal/BrandButton";
import { getSession, setSession, clearSession } from "@/lib/portal-store";
import { changePassword } from "@/lib/api/portal-api";

export const Route = createFileRoute("/change-password")({
  head: () => ({ meta: [{ title: "Update Your Password — OHCTECH" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s.token) {
      navigate({ to: "/" });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const { token } = getSession();
      if (!token) throw new Error("Session expired");

      await changePassword(password, token);
      
      const fresh = getSession();
      setSession({ mustChangePassword: false });
      toast.success("Password updated successfully");
      navigate({ to: fresh.registered ? "/dashboard" : "/questionnaire" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalShell>
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-2xl border-slate-200 shadow-xl shadow-slate-200/60">
          <CardContent className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-foreground">Update Password</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                For security reasons, you must set a new password before proceeding.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Confirm Password</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-lg"
                  required
                />
              </div>

              <div className="pt-2">
                <BrandButton type="submit" className="w-full h-11" disabled={submitting}>
                  {submitting ? "Updating..." : "Update & Continue"}
                </BrandButton>
              </div>
            </form>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  clearSession();
                  navigate({ to: "/" });
                }}
                className="text-xs font-medium text-muted-foreground hover:text-emerald-600 hover:underline"
              >
                Sign out and cancel
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
