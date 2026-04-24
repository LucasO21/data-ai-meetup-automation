"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function NavBar() {
  const { data: session, status } = useSession();

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2 flex justify-between items-center gap-3">
        <Link href="/" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
          Home
        </Link>
        {status === "loading" ? (
          <div className="w-20 h-7 bg-gray-100 rounded-lg animate-pulse" />
        ) : session?.user ? (
          <>
            <span className="text-xs text-gray-400">{session.user.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn("google", { callbackUrl: "/events" })}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </div>
  );
}
