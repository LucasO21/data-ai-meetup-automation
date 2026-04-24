import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? process.env.NEXT_PUBLIC_OWNER_EMAIL;

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Landing page: fully public
  if (pathname === "/") return NextResponse.next();

  // Events page + read-only API: any authenticated user
  if (pathname.startsWith("/events") || pathname.startsWith("/api/events")) {
    if (!token) {
      const signIn = new URL("/api/auth/signin", req.url);
      signIn.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  }

  // Everything else: owner only
  if (token?.email !== OWNER_EMAIL) {
    const signIn = new URL("/api/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except NextAuth internals and static assets
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
