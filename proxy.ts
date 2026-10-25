import { NextResponse, type NextRequest } from "next/server";
import { checkOwner } from "@/lib/owner";

const LOGIN = "/admin/login";
const noStore = { "cache-control": "no-store" };

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === LOGIN) return NextResponse.next();
  const r = await checkOwner(request.headers);
  if ("email" in r) return NextResponse.next();
  if (r.error === "unconfigured") return new NextResponse("Admin login is not configured", { status: 503, headers: noStore });
  if (pathname.startsWith("/api/") || request.method !== "GET") return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStore });
  const to = new URL(LOGIN, request.url);
  to.searchParams.set("next", pathname + search);
  return NextResponse.redirect(to, { status: 303, headers: noStore });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
