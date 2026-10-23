import { NextResponse, type NextRequest } from "next/server";
import { checkOwner } from "@/lib/owner";

export async function proxy(request: NextRequest) {
  const r = await checkOwner(request.headers);
  if ("email" in r) return NextResponse.next();
  const [status, body] = r.error === "unconfigured" ? [503, "Admin access is not configured"] : [403, "Forbidden"];
  return new NextResponse(body, { status, headers: { "cache-control": "no-store" } });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
