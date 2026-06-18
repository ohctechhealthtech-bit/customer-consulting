import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ClipboardList, User, Loader2, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalShell, Stepper } from "@/components/portal/Shell";
import { BrandButton } from "@/components/portal/BrandButton";
import { CountryPhoneInput } from "@/components/portal/CountryPhoneInput";
import { getSession, getPortalToken, setSession } from "@/lib/portal-store";
import {
  fetchQuestions,
  submitQuestionnaire,
  submitConsent,
  logout,
  type Question,
} from "@/lib/api/portal-api";

export const Route = createFileRoute("/questionnaire")({
  head: () => ({ meta: [{ title: "Patient Registration — OHCTECH" }] }),
  component: QuestionnairePage,
});

const SECTION_ICONS: Record<string, ReactNode> = {
  personal: <User className="h-4 w-4" />,
};

const SECTION_TITLES: Record<string, string> = {
  personal: "Personal Details",
  policy: "Data Policy",
};

const SECTION_SUBTITLES: Record<string, string> = {
  personal: "Please provide your personal information for patient registration.",
  policy: "Please review our data privacy and processing policies.",
};

const DATA_PRIVACY_POLICY = `We take your privacy seriously. Your personal information is collected only for clinical registration, care coordination, and authorized communication. We implement industry-standard encryption and security protocols to protect your data from unauthorized access. Your information will never be shared with third parties without your explicit consent, except where required by law.`;

const DATA_PROCESSING_POLICY = `By using our platform, you consent to the processing of your data for the purpose of maintaining accurate medical records and facilitating healthcare services. Processing includes storage, retrieval, and internal analysis by authorized healthcare professionals. We retain your data only for as long as necessary to provide care and comply with regulatory retention periods.`;

const CONSENT_LABEL =
  "I consent to the collection, processing, storage, and use of my information for healthcare and administrative purposes.";

type FormData = Record<string, string>;

/**
 * React Hook Form treats dots in field names as nested paths.
 * E.g. `name="personal.firstName"` stores as `{ personal: { firstName: "John" } }`.
 * This helper flattens nested values back into dot-notation keys
 * so they match the Zod schema keys (e.g. `{ "personal.firstName": "John" }`).
 */
function flattenValues(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(value: unknown, prefix: string) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[prefix] = String(value);
    }
  }
  walk(obj, "");
  return result;
}

function buildSectionSchema(questions: Question[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) {
    let field: z.ZodTypeAny;
    if (q.fieldType === "phone") {
      field = z
        .string()
        .trim()
        .min(q.isRequired ? 7 : 0, q.isRequired ? "Required" : "")
        .max(24, "Number is too long")
        .superRefine((val, ctx) => {
          if (!val) return;
          if (val.startsWith("+91")) {
            const digits = val.replace(/\D/g, "").slice(2); // remove 91
            if (digits.length !== 10) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Indian mobile numbers must be exactly 10 digits",
              });
            }
          }
        });
      if (!q.isRequired) field = field.optional().or(z.literal(""));
    } else if (q.questionKey === "personal.email") {
      field = z.string().trim().email("Enter a valid email").max(255);
    } else if (q.fieldType === "textarea") {
      field = z.string().max(500).optional();
    } else if (q.fieldType === "select") {
      field = z.string().min(q.isRequired ? 1 : 0, q.isRequired ? "Select an option" : "");
      if (!q.isRequired) field = field.optional();
    } else {
      const maxLength =
        (q.validationRules?.maxLength as number) ?? (q.fieldType === "date" ? 10 : 255);
      field = z
        .string()
        .trim()
        .min(q.isRequired ? 1 : 0, q.isRequired ? "Required" : "")
        .max(maxLength, `Maximum ${maxLength} characters`);
      if (!q.isRequired) field = field.optional().or(z.literal(""));
    }
    shape[q.questionKey] = field;
  }
  return z.object(shape);
}


function QuestionnairePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [consentGranted, setConsentGranted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState<Record<string, Question[]>>({});
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [sectionSchemas, setSectionSchemas] = useState<
    Record<string, z.ZodObject<z.ZodRawShape>>
  >({});

  const existing = getSession();

  // All useForm hooks at the top level — never inside useState/setState/conditions
  const personalForm = useForm<FormData>({
    defaultValues: {
      personal: {
        email: existing.email || "",
      },
    } as any,
  });

  const formMap: Record<string, UseFormReturn<FormData>> = {
    personal: personalForm,
  };

  useEffect(() => {
    if (!existing.otpVerified) {
      navigate({ to: "/" });
      return;
    }
    loadQuestions();
  }, [existing.otpVerified, navigate]);

  async function loadQuestions() {
    try {
      const data = await fetchQuestions();
      
      // Keep only specific sections
      const keptSections = ["personal"];
      const filteredSections: Record<string, Question[]> = {};
      const order: string[] = [];

      for (const k of keptSections) {
        if (data.sections[k]) {
          filteredSections[k] = data.sections[k];
          order.push(k);
        }
      }

      setSections(filteredSections);
      setSectionOrder(order);

      const schemas: Record<string, z.ZodObject<z.ZodRawShape>> = {};
      for (const sec of order) {
        schemas[sec] = buildSectionSchema(data.sections[sec]);
      }
      setSectionSchemas(schemas);
      setLoading(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load questions");
      navigate({ to: "/" });
    }
  }

  const steps = sectionOrder.map((s) => SECTION_TITLES[s] || s);
  const fullSteps = [...steps, "Data Policy", "Review"];

  const currentSec = sectionOrder[step];
  const isPolicyStep = step === fullSteps.length - 2;
  const isReviewStep = step === fullSteps.length - 1;

  const validateSection = useCallback(
    async (sec: string): Promise<boolean> => {
      const schema = sectionSchemas[sec];
      if (!schema) return true;
      const raw = formMap[sec]?.getValues() ?? {};
      // Flatten dotted keys: { personal: { firstName: "John" } } → { "personal.firstName": "John" }
      const values = flattenValues(raw as Record<string, unknown>);
      const result = schema.safeParse(values);
      if (result.success) return true;

      // Set form-level errors
      const form = formMap[sec];
      if (!form) return false;

      const fieldErrors = result.error.flatten().fieldErrors;
      for (const [key, errors] of Object.entries(fieldErrors)) {
        if (errors && errors.length > 0) {
          form.setError(key, { type: "manual", message: errors[0] });
        }
      }
      return false;
    },
    [sectionSchemas, formMap],
  );

  const next = async () => {
    const sec = sectionOrder[step];
    if (!sec) {
      setStep((s) => s + 1);
      return;
    }
    const ok = await validateSection(sec);
    if (!ok) return;
    setStep((s) => Math.min(fullSteps.length - 1, s + 1));
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    const token = getPortalToken();
    if (!token) {
      toast.error("Session expired. Please sign in again.");
      navigate({ to: "/" });
      return;
    }

    // Validate all sections before submit
    for (const sec of sectionOrder) {
      const ok = await validateSection(sec);
      if (!ok) {
        const idx = sectionOrder.indexOf(sec);
        setStep(idx);
        toast.error("Please fix errors before submitting");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Collect all responses from all sections
      const responses: { questionId: number; value: string }[] = [];
      for (const sec of sectionOrder) {
        const raw = formMap[sec]?.getValues() ?? {};
        // Flatten dotted keys so values["personal.firstName"] works
        const values = flattenValues(raw as Record<string, unknown>);
        for (const q of sections[sec]) {
          const val = values[q.questionKey];
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            responses.push({ questionId: q.id, value: String(val).trim() });
          }
        }
      }

      // Submit questionnaire
      await submitQuestionnaire(responses, token);

      // Submit consent
      const action = consentGranted ? "ACCEPT" : "REJECT";
      const consentResult = await submitConsent(action, token);

      // Persist result for thank-you page IMMEDIATELY after receiving it
      setSession({
        consent: action === "ACCEPT" ? "allow" : "deny",
        referenceNumber: consentResult.referenceNumber,
        submittedAt: consentResult.submittedAt,
      });

      // Logout (fire-and-forget)
      try {
        await logout(token);
      } catch {
        // silently ignore
      }

      navigate({ to: "/processing" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PortalShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <h2 className="mt-5 text-xl font-bold tracking-tight">Loading questionnaire</h2>
              <p className="mt-1 text-sm text-muted-foreground">Please wait…</p>
            </CardContent>
          </Card>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Stepper step={step} steps={fullSteps} />
        </div>
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {!isPolicyStep && !isReviewStep && currentSec && (
              <DynamicSectionForm
                questions={sections[currentSec] ?? []}
                form={formMap[currentSec]}
                icon={SECTION_ICONS[currentSec]}
                title={SECTION_TITLES[currentSec]}
                subtitle={SECTION_SUBTITLES[currentSec]}
                onClearError={(key) => formMap[currentSec]?.clearErrors(key)}
              />
            )}

            {isPolicyStep && (
              <DataPolicyBlock
                onAccept={next}
                onReject={async () => {
                  const token = getPortalToken();
                  if (token) {
                    try {
                      await submitConsent("REJECT", token);
                    } catch (e) {
                      console.error("Failed to submit rejection", e);
                    }
                  }
                  toast.error("Consent rejected. Your data has not been saved.");
                  logout(token || "").then(() => navigate({ to: "/" }));
                }}
              />
            )}

            {isReviewStep && (
              <ReviewBlock
                sections={sections}
                sectionOrder={sectionOrder}
                formMap={formMap}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            )}

            {!isPolicyStep && !isReviewStep && step < fullSteps.length - 1 && (
              <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
                <BrandButton variant="outline" onClick={prev} disabled={step === 0}>
                  Previous
                </BrandButton>
                <BrandButton onClick={next}>Next</BrandButton>
              </div>
            )}

            {(isPolicyStep || isReviewStep) && (
              <div className="mt-6">
                <BrandButton variant="outline" onClick={prev}>
                  Previous
                </BrandButton>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}

// ---------------------------------------------------------------------------
// Dynamic section form — rendered from API question definitions
// ---------------------------------------------------------------------------

function DynamicSectionForm({
  questions,
  form,
  icon,
  title,
  subtitle,
  onClearError,
}: {
  questions: Question[];
  form: UseFormReturn<FormData>;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClearError?: (key: string) => void;
}) {
  return (
    <Form {...form}>
      <SectionHeading icon={icon} title={title} subtitle={subtitle} />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {questions.map((q) => {
          let colSpan = "";
          if (q.fieldType === "textarea") {
            colSpan = "sm:col-span-2";
          }

          return (
            <FormField
              key={q.id}
              control={form.control}
              name={q.questionKey as any}
              render={({ field }) => (
                <FormItem className={colSpan}>
                  <FieldLabel required={q.isRequired}>{q.label}</FieldLabel>
                  <FormControl>
                    {q.fieldType === "textarea" ? (
                      <Textarea
                        rows={3}
                        className="rounded-lg"
                        placeholder={q.placeholder ?? ""}
                        {...field}
                        value={String(field.value ?? "")}
                        onChange={(e) => {
                          field.onChange(e);
                          onClearError?.(q.questionKey);
                        }}
                      />
                    ) : q.fieldType === "select" ? (
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          onClearError?.(q.questionKey);
                        }}
                        value={String(field.value ?? "")}
                      >
                        <SelectTrigger className="h-11 rounded-lg">
                          <SelectValue placeholder={q.placeholder ?? `Select ${q.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(q.options ?? []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : q.fieldType === "phone" ? (
                      <CountryPhoneInput
                        value={String(field.value ?? "")}
                        onChange={(v) => {
                          field.onChange(v);
                          onClearError?.(q.questionKey);
                        }}
                      />
                    ) : q.fieldType === "date" ? (
                      <Input
                        type="date"
                        className="h-11 rounded-lg"
                        {...field}
                        value={String(field.value ?? "")}
                        onChange={(e) => {
                          field.onChange(e);
                          onClearError?.(q.questionKey);
                        }}
                      />
                    ) : (
                      <Input
                        type={q.questionKey === "personal.email" ? "email" : "text"}
                        className="h-11 rounded-lg"
                        placeholder={q.placeholder ?? ""}
                        {...field}
                        value={String(field.value ?? "")}
                        onChange={(e) => {
                          field.onChange(e);
                          onClearError?.(q.questionKey);
                        }}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        })}
      </div>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Data Policy block
// ---------------------------------------------------------------------------
function DataPolicyBlock({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) {
  return (
    <div className="space-y-6">
      <SectionHeading
        icon={<ShieldCheck className="h-4 w-4" />}
        title={SECTION_TITLES.policy}
        subtitle={SECTION_SUBTITLES.policy}
      />

      <div className="space-y-6 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <div>
          <h3 className="text-sm font-bold text-foreground">Data Privacy Policy</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{DATA_PRIVACY_POLICY}</p>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-bold text-foreground">Data Processing Policy</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {DATA_PROCESSING_POLICY}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <BrandButton
          variant="outline"
          onClick={onReject}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          Reject
        </BrandButton>
        <BrandButton onClick={onAccept}>Accept & Continue</BrandButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review block
// ---------------------------------------------------------------------------
function ReviewBlock({
  sections,
  sectionOrder,
  formMap,
  onSubmit,
  submitting,
}: {
  sections: Record<string, Question[]>;
  sectionOrder: string[];
  formMap: Record<string, UseFormReturn<FormData>>;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div>
      <SectionHeading
        icon={<ClipboardList className="h-4 w-4" />}
        title="Review & Submit"
        subtitle="Please review your information and confirm your consent before submitting."
      />

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        {sectionOrder.map((sec) => {
          const raw = formMap[sec]?.getValues() ?? {};
          const values = flattenValues(raw as Record<string, unknown>);
          const rows: [string, string | undefined][] = sections[sec].map((q) => [
            q.label,
            values[q.questionKey] ? String(values[q.questionKey]) : undefined,
          ]);
          return (
            <ReviewSection key={sec} title={SECTION_TITLES[sec] || sec} rows={rows} />
          );
        })}
      </div>

      <div className="mt-6 flex justify-end border-t border-slate-200 pt-6">
        <BrandButton onClick={onSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Form"}
        </BrandButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components (preserving original design)
// ---------------------------------------------------------------------------
function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <FormLabel className="text-xs font-semibold text-foreground">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </FormLabel>
  );
}

function ReviewSection({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | undefined][];
}) {
  return (
    <div className="border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {k}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {v && v.toString().trim() ? v : "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ConsentDeclaration({
  consentGranted,
  onConsentChange,
  onSubmit,
  submitting,
}: {
  consentGranted: boolean;
  onConsentChange: (granted: boolean) => void;
  onSubmit?: () => void;
  submitting?: boolean;
}) {
  return (
    <div className="border-t border-slate-200 pt-6">
      <h3 className="text-sm font-semibold text-foreground">Consent Declaration</h3>
      <p className="mt-2 max-w-prose text-[11px] leading-relaxed text-muted-foreground">
        By submitting this patient registration form, you acknowledge that your personal,
        medical, and contact information will be collected and processed by the organization in
        accordance with applicable privacy and healthcare regulations. Information provided will
        be used for patient onboarding, care coordination, and authorized communication purposes
        only.
      </p>
      <div className="mt-4">
        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox
            id="consent-granted"
            checked={consentGranted}
            onCheckedChange={(checked) => onConsentChange(checked === true)}
            className="mt-0.5 h-3.5 w-3.5 rounded-[3px] border-slate-300"
          />
          <span className="text-[11px] leading-snug text-foreground">{CONSENT_LABEL}</span>
        </label>
      </div>
    </div>
  );
}