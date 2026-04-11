import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = ["/dashboard", "/api/admin", "/api/listings", "/api/payment"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token.isBlocked) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Blocked by admin" }, { status: 403 });
    }
    const blockedUrl = new URL("/blocked", request.url);
    return NextResponse.redirect(blockedUrl);
  }

  if (token.role === "seller" && token.sellerApprovalStatus !== "approved" && pathname.startsWith("/dashboard/seller")) {
    const pendingUrl = new URL("/pending-approval", request.url);
    return NextResponse.redirect(pendingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*", "/api/listings/:path*", "/api/payment/:path*"],
};
