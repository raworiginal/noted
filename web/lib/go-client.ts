// lib/go-client.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const GO_BACKEND_URL =
  process.env.GO_BACKEND_URL ?? "http://localhost:8080";

export async function getAuthHeaders() {
  const jwtResponse = await auth.api.getToken({ headers: await headers() });
  return {
    Authorization: `Bearer ${jwtResponse?.token}`,
    "Content-Type": "application/json",
  };
}
