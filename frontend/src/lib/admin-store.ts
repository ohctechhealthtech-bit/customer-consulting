export type AdminUser = {
  id: number;
  email: string;
};

export type AdminSession = {
  token?: string;
  admin?: AdminUser;
};

const KEY = "admin_session_v1";

export function getAdminSession(): AdminSession {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : {};
  } catch {
    return {};
  }
}

export function setAdminSession(patch: AdminSession): AdminSession {
  const next = { ...getAdminSession(), ...patch };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearAdminSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminSession().token);
}

export function getAdminToken(): string | undefined {
  return getAdminSession().token;
}

export function getAdminInitials(email?: string): string {
  const value = email || getAdminSession().admin?.email || "AD";
  const local = value.split("@")[0] || value;
  return local.slice(0, 2).toUpperCase();
}
