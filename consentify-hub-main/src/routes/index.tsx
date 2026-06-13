import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { sendOtp } from "@/lib/api/portal-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — OHCTECH Consent Portal" },
      {
        name: "description",
        content: "Securely verify your email to continue with the OHCTECH consent portal.",
      },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(255),
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      await sendOtp(values.email);
      setSession({ email: values.email, otpVerified: false });
      toast.success("OTP sent", {
        description: `We sent a 6-digit code to ${values.email}`,
      });
      navigate({ to: "/otp" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
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
              <p className="mt-5 text-sm text-muted-foreground font-medium">
                Patient Consent & Data Collection Portal
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-foreground">
                        Email <span className="text-rose-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          className="h-11 rounded-full px-4"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <BrandButton type="submit" fullWidth disabled={loading}>
                  {loading ? "Sending OTP…" : "Send OTP"}
                </BrandButton>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}