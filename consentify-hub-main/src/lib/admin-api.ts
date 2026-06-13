import { clearAdminSession, getAdminToken, setAdminSession, type AdminUser } from "./admin-store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ token: string; admin: AdminUser }> {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const json = (await res.json()) as ApiResponse<{ token: string; admin: AdminUser }>;
  if (!res.ok || !json.success || !json.data?.token) {
    throw new Error(json.message || "Invalid email or password");
  }

  setAdminSession({ token: json.data.token, admin: json.data.admin });
  return json.data;
}

export function adminLogout() {
  clearAdminSession();
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin authentication required");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Request failed");
  }

  return json.data as T;
}
