// Portal (customer-facing) API client
// All endpoints mounted behind VITE_API_URL (default http://localhost:5000)

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

/** POST /api/auth/send-otp */
export async function sendOtp(email: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json: ApiResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to send OTP");
  }
}

type VerifyOtpData = {
  token: string;
  customerId: number;
  email: string;
  loginHistoryId: number;
};

/** POST /api/auth/verify-otp → returns JWT + customer info */
export async function verifyOtp(
  email: string,
  otp: string,
): Promise<VerifyOtpData> {
  const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const json: ApiResponse<VerifyOtpData> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "OTP verification failed");
  }
  return json.data;
}

/** GET /api/questions */
export type Question = {
  id: number;
  questionKey: string;
  section: "personal" | "address" | "medical" | "additional";
  label: string;
  fieldType: "text" | "textarea" | "date" | "select" | "phone";
  placeholder: string | null;
  options: string[] | null;
  displayOrder: number;
  isRequired: boolean;
  validationRules: Record<string, unknown> | null;
};

type FetchQuestionsData = {
  questions: Question[];
  sections: Record<string, Question[]>;
};

export async function fetchQuestions(): Promise<FetchQuestionsData> {
  const res = await fetch(`${API_URL}/api/questions`);
  const json: ApiResponse<FetchQuestionsData> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to fetch questions");
  }
  return json.data;
}

type SubmitQuestionnaireData = {
  customerId: number;
  responseCount: number;
};

/** POST /api/questionnaire/submit */
export async function submitQuestionnaire(
  responses: { questionId: number; value: string }[],
  token: string,
): Promise<SubmitQuestionnaireData> {
  const res = await fetch(`${API_URL}/api/questionnaire/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ responses }),
  });
  const json: ApiResponse<SubmitQuestionnaireData> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to submit questionnaire");
  }
  return json.data;
}

type SubmitConsentData = {
  referenceNumber: string;
  consent: "allow" | "deny";
  consentStatus: "Allowed" | "Declined";
  submittedAt: string;
  dataRetained: boolean;
};

/** POST /api/consent */
export async function submitConsent(
  consent: "allow" | "deny",
  token: string,
): Promise<SubmitConsentData> {
  const res = await fetch(`${API_URL}/api/consent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ consent }),
  });
  const json: ApiResponse<SubmitConsentData> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to submit consent");
  }
  return json.data;
}

/** POST /api/auth/logout */
export async function logout(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const json: ApiResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Logout failed");
  }
}