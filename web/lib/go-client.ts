"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getAuthHeaders() {
  const jwtResponse = await auth.api.getToken({ headers: await headers() });
  return {
    Authorization: `Bearer ${jwtResponse?.token}`,
    "Content-Type": "application/json",
  };
}
