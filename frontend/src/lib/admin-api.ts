import { clearAdminSession, getAdminToken, setAdminSession, type AdminUser } from "./admin-store";

const API_URL = import.meta.env.VITE_API_URL || "";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ token: string; admin: AdminUser }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const json = (await res.json()) as ApiResponse<{ token: string; role: string; admin: AdminUser }>;
  if (!res.ok || !json.success || !json.data?.token) {
    throw new Error(json.message || "Invalid email or password");
  }
  if (json.data.role !== "admin") {
    throw new Error("Access denied: admin account required");
  }

  setAdminSession({ token: json.data.token, admin: json.data.admin });
  return { token: json.data.token, admin: json.data.admin };
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
