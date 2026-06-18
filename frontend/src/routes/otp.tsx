import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MailCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PortalShell } from "@/components/portal/Shell";
import { BrandButton } from "@/components/portal/BrandButton";
import { getSession, setSession } from "@/lib/portal-store";
import { sendOtp, verifyOtp } from "@/lib/api/portal-api";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify OTP — OHCTECH" }] }),
  component: OtpPage,
});

function OtpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s.email) {
      navigate({ to: "/" });
      return;
    }
    setEmail(s.email);
  }, [navigate]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const verify = async () => {
    if (code.length < 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyOtp(email, code);
      setSession({
        otpVerified: true,
        token: result.token,
        customerId: result.customerId,
        loginHistoryId: result.loginHistoryId,
        mustChangePassword: !!result.customer?.mustChangePassword,
      });
      toast.success("Email verified");
      
      if (result.customer?.mustChangePassword) {
        navigate({ to: "/change-password" });
      } else if (result.customer?.registered) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/questionnaire" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await sendOtp(email);
      setSeconds(60);
      setCode("");
      toast.success("New OTP sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <PortalShell>
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-2xl border-slate-200 shadow-xl shadow-slate-200/60">
          <CardContent className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <MailCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight">Verify your email</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-foreground">{email || "your email"}</span>
              </p>
            </div>

            <div className="mt-8 flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="mt-5 text-center text-xs text-muted-foreground">
              {seconds > 0 ? (
                <>
                  Code expires in{" "}
                  <span className="font-semibold text-foreground">{seconds}s</span>
                </>
              ) : (
                <button
                  onClick={resend}
                  disabled={resending}
                  className="font-semibold text-emerald-600 hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend OTP"}
                </button>
              )}
            </div>

            <div className="mt-7 flex gap-3">
              <BrandButton
                variant="outline"
                className="flex-1"
                onClick={() => navigate({ to: "/" })}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </BrandButton>
              <BrandButton
                className="flex-1"
                onClick={verify}
                disabled={verifying || code.length < 6}
              >
                {verifying ? "Verifying…" : "Verify OTP"}
              </BrandButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}