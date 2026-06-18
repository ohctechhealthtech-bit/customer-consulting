// Portal session store — persisted in localStorage.
// JWT token is stored here so authenticated API calls can read it.

export type PortalSession = {
  email?: string;
  otpVerified?: boolean;
  token?: string;
  customerId?: number;
  loginHistoryId?: number;
  consent?: "allow" | "deny";
  referenceNumber?: string;
  submittedAt?: string;
  mustChangePassword?: boolean;
  registered?: boolean;
};

const KEY = "portal_session_v1";

export function getSession(): PortalSession {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PortalSession) : {};
  } catch {
    return {};
  }
}

export function setSession(patch: Partial<PortalSession>): PortalSession {
  const next = { ...getSession(), ...patch };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export function getPortalToken(): string | undefined {
  return getSession().token;
}
