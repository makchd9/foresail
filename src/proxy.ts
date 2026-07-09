import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * Route guard: /app requires a session; auth pages bounce signed-in users
 * back to the app. Authorization (roles, ownership) happens server-side in
 * every query and action — this layer is purely navigation UX.
 */
export default auth((request) => {
  const { nextUrl } = request;
  const isSignedIn = Boolean(request.auth);

  if (nextUrl.pathname.startsWith("/app") && !isSignedIn) {
    const login = new URL("/login", nextUrl);
    login.searchParams.set("from", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (isSignedIn && AUTH_PAGES.some((page) => nextUrl.pathname === page)) {
    return NextResponse.redirect(new URL("/app", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*", "/login", "/signup", "/forgot-password", "/reset-password"],
};
