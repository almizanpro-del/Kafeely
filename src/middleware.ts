import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "kafeely_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "kafeely-dev-secret-2026-dubai-rental-protection"
);

/**
 * Route protection:
 *  - "/"                    → marketing-style portal (public)
 *  - "/sign-in"             → public (redirects to role home if signed in)
 *  - "/app/..."             → requires session; role match enforced in layout
 *  - "/api/auth/*"          → public
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  let role: string | null = null;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      role = (payload.role as string) ?? null;
    } catch {
      role = null;
    }
  }

  const isApp = pathname === "/app" || pathname.startsWith("/app/");

  if (isApp && !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/sign-in" && role) {
    const url = req.nextUrl.clone();
    url.pathname = `/app/${role.replace("_", "-")}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/sign-in", "/api/auth/:path*"],
};
