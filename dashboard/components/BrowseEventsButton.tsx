"use client";

import { signIn } from "next-auth/react";

export function BrowseEventsButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/events" })}
      className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
    >
      Browse Events →
    </button>
  );
}
