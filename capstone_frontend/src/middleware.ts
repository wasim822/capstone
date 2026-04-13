// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {

  const token = request.cookies.get("session-token")?.value;

  const protectedRoutes = [
    "/dashboard",
    "/settings",
    "/profile",
    "/ai-insights",
    "/reports",
    "/inventory",
    "/people",
    "/departments",
    "/my-tasks",
    "/activity",
    "/orders",
  ];

  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/ai-insights/:path*",
    "/reports/:path*",
    "/inventory/:path*",
    "/people/:path*",
    "/departments/:path*",
    "/my-tasks/:path*",
    "/activity/:path*",
    "/orders/:path*",
  ],
};