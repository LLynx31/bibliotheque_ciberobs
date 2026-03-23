import api from "./api";
import { AuthTokens, User } from "@/types";

export async function login(
  username: string,
  password: string
): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>("/auth/login/", {
    username,
    password,
  });
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
}

export async function logout(): Promise<void> {
  const refresh = localStorage.getItem("refresh_token");
  try {
    await api.post("/auth/logout/", { refresh });
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get<User>("/auth/me/");
  return data;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
