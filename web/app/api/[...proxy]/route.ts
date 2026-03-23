import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL ?? "http://localhost:8080";

async function proxy(req: NextRequest): Promise<NextResponse> {
  // Get the current session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get a JWT for this session user
  const jwtResponse = await auth.api.getToken({ headers: await headers() });
  if (!jwtResponse?.token) {
    return NextResponse.json(
      { error: "could not issue token" },
      { status: 500 },
    );
  }

  // Strip /api prefix, forward to Go
  const url = req.nextUrl.pathname.replace(/^\/api/, "");
  const search = req.nextUrl.search ?? "";
  const targetURL = `${GO_BACKEND_URL}${url}${search}`;

  const forwardedHeaders = new Headers(req.headers);
  forwardedHeaders.set("Authorization", `Bearer ${jwtResponse.token}`);
  // Remove Next.js internal headers that shouldn't be forwarded
  forwardedHeaders.delete("host");

  const goRes = await fetch(targetURL, {
    method: req.method,
    headers: forwardedHeaders,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    duplex: "half",
  } as RequestInit);

  const body = await goRes.arrayBuffer();
  const hasBody = goRes.status !== 204 && goRes.status !== 304;

  return new NextResponse(hasBody ? body : null, {
    status: goRes.status,
    headers: {
      "Content-Type": goRes.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
