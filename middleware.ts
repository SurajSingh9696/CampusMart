import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/dashboard",
  "/admin",
  "/customer",
  "/seller",
  "/api/admin",
  "/api/listings",
  "/api/payment",
  "/api/profile",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isApiRequest = pathname.startsWith("/api");
  const isAuthPublicPath =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/blocked") ||
    pathname.startsWith("/pending-approval") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/colleges") ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/service-worker.js");

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const blockedReason = typeof token?.blockedReason === "string" ? token.blockedReason : "";
  if (token?.isBlocked && !pathname.startsWith("/blocked") && !pathname.startsWith("/auth")) {
    if (isApiRequest && !pathname.startsWith("/api/auth")) {
      return NextResponse.json({ error: "Blocked by admin", reason: blockedReason }, { status: 403 });
    }

    const blockedUrl = new URL("/blocked", request.url);
    if (blockedReason) blockedUrl.searchParams.set("reason", blockedReason);
    return NextResponse.redirect(blockedUrl);
  }

  if (!isProtected && isAuthPublicPath) return NextResponse.next();

  if (!token) {
    if (isApiRequest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isProtected) return NextResponse.next();

    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && token.role !== "admin") {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/customer") && token.role !== "customer") {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/seller") && token.role !== "seller") {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (
    token.role === "seller" &&
    token.sellerApprovalStatus !== "approved" &&
    (pathname.startsWith("/dashboard/seller") || pathname.startsWith("/seller"))
  ) {
    const pendingUrl = new URL("/pending-approval", request.url);
    return NextResponse.redirect(pendingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
