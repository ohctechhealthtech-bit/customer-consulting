import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { PortalShell, BrandLogo } from "@/components/portal/Shell";
import { BrandButton } from "@/components/portal/BrandButton";
import { setSession } from "@/lib/portal-store";
import { sendOtp, portalLogin } from "@/lib/api/portal-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — OHCTECH Consent Portal" },
      {
        name: "description",
        content: "Securely sign in to the OHCTECH consent portal.",
      },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(255),
  password: z.string().optional(),
});

type LoginSchema = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"otp" | "password">("otp");

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginSchema) => {
    if (mode === "password" && !values.password) {
      form.setError("password", { message: "Password is required for login" });
      return;
    }

    setLoading(true);
    try {
      if (mode === "otp") {
        await sendOtp(values.email);
        setSession({ email: values.email, otpVerified: false });
        toast.success("OTP sent", {
          description: `We sent a 6-digit code to ${values.email}`,
        });
        navigate({ to: "/otp" });
      } else {
        const result = await portalLogin(values.email, values.password!);
        
        if (result.role === "admin") {
          const { setAdminSession } = await import("@/lib/admin-store");
          setAdminSession({ token: result.token, admin: result.admin });
          toast.success("Welcome back, Admin");
          navigate({ to: "/admin" });
          return;
        }

        setSession({
          otpVerified: true,
          token: result.token,
          customerId: result.customer?.id,
          email: result.customer?.email,
          mustChangePassword: result.customer?.mustChangePassword,
          registered: result.customer?.registered,
          loginHistoryId: result.loginHistoryId,
        });
        
        toast.success("Signed in successfully");
        
        if (result.customer?.mustChangePassword) {
          navigate({ to: "/change-password" });
        } else if (result.customer?.registered) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/questionnaire" });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalShell>
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-2xl border-slate-200 shadow-xl shadow-slate-200/60">
          <CardContent className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <BrandLogo size="lg" />
              <p className="mt-5 text-sm font-medium text-muted-foreground">
                Patient Consent & Data Collection Portal
              </p>
            </div>

            <div className="mt-8 flex rounded-lg bg-slate-100 p-1 p-1">
              <button
                type="button"
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                  mode === "otp" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMode("otp")}
              >
                OTP Verification
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                  mode === "password" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMode("password")}
              >
                Password Login
              </button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-foreground">
                        Email address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          className="h-11 rounded-full px-4"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode === "password" && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-foreground">
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="h-11 rounded-full px-4"
                            autoComplete="current-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <BrandButton type="submit" fullWidth disabled={loading}>
                  {loading 
                    ? (mode === "otp" ? "Sending OTP…" : "Signing in…")
                    : (mode === "otp" ? "Send OTP" : "Sign In")
                  }
                </BrandButton>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}