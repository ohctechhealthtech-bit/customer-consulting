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

export type AuthResponse = {
  token: string;
  role: "admin" | "customer";
  customerId?: number;
  email?: string;
  loginHistoryId?: number;
  customer?: {
    id: number;
    email: string;
    mustChangePassword: boolean;
    registered: boolean;
  };
  admin?: {
    id: number;
    email: string;
  };
};

/** POST /api/auth/verify-otp → returns JWT + user info */
export async function verifyOtp(
  email: string,
  otp: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const json: ApiResponse<AuthResponse> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "OTP verification failed");
  }
  return json.data;
}

/** POST /api/auth/login → returns JWT + user info */
export async function portalLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json: ApiResponse<AuthResponse> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Invalid email or password");
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
  const res = await fetch(`${API_URL}/api/questionnaire`);
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
  action: "ACCEPT" | "REJECT" | "WITHDRAW",
  token: string,
): Promise<SubmitConsentData> {
  const res = await fetch(`${API_URL}/api/consent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
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

/** POST /api/auth/change-password */
export async function changePassword(password: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });
  const json: ApiResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to change password");
  }
}

export type ProfileData = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  age: number | null;
  companyId: number | null;
  companyName: string | null;
  employeeCode: string | null;
};

/** GET /api/portal/profile */
export async function fetchProfile(token: string): Promise<ProfileData> {
  const res = await fetch(`${API_URL}/api/portal/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: ApiResponse<ProfileData> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to fetch profile");
  }
  return json.data;
}

/** PUT /api/portal/profile */
export async function updateProfile(
  data: Partial<Omit<ProfileData, "id">>,
  token: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/portal/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<{ message: string }> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to update profile");
  }
  return json.data;
}

export type ProfileChange = {
  id: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
};

export type ProfileUpdateGroup = {
  updatedAt: string;
  updatedBy: string;
  changes: ProfileChange[];
};

/** GET /api/portal/profile/history */
export async function fetchProfileHistory(
  token: string,
): Promise<ProfileUpdateGroup[]> {
  const res = await fetch(`${API_URL}/api/portal/profile/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: ApiResponse<ProfileUpdateGroup[]> = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to fetch profile history");
  }
  return json.data;
}