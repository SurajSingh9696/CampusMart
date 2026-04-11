import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const { pathname } = req.nextUrl;

    // Block blocked users from protected routes
    if (token?.isBlocked && !pathname.startsWith("/blocked") && !pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/blocked", req.url));
    }

    // Seller pending approval
    if (
      token?.role === "seller" &&
      token?.sellerApprovalStatus === "pending" &&
      pathname.startsWith("/seller") &&
      !pathname.startsWith("/pending-approval")
    ) {
      return NextResponse.redirect(new URL("/pending-approval", req.url));
    }

    // Role-based route guards
    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    if (pathname.startsWith("/seller") && token?.role !== "seller") {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    if (pathname.startsWith("/customer") && token?.role !== "customer") {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/pending-approval") ||
          pathname.startsWith("/blocked") ||
          pathname.startsWith("/api/colleges") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/register") ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/favicon")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
