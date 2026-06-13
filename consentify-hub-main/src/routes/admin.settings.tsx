import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin Console" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AdminLayout title="Settings">
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Organisation" desc="Public-facing details shown on the portal.">
          <Field label="Display name" defaultValue="OHCTECH" />
          <Field label="Support email" defaultValue="support@meridiantrust.com" />
          <Field label="Privacy policy URL" defaultValue="https://meridiantrust.com/privacy" />
        </Section>
        <Section title="Security" desc="Authentication and session controls.">
          <Toggle label="Require OTP for every login" defaultChecked />
          <Toggle label="Enforce 2FA for admins" defaultChecked />
          <Field label="OTP validity (seconds)" defaultValue="60" type="number" />
        </Section>
        <Section title="Consent text" desc="Shown on the customer consent page.">
          <Label>Default consent statement</Label>
          <Textarea
            rows={6}
            defaultValue={"We collect your information solely to provide regulated services and improve your experience. You may revoke consent at any time."}
          />
        </Section>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => toast.success("Settings saved")}>Save changes</Button>
      </div>
    </AdminLayout>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} type={type} className="h-10" />
    </div>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="text-sm">{label}</div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
