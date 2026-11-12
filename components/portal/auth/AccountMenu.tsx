"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useState } from "react";

export function AccountMenu({ returnToInvite = false }: { returnToInvite?: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [error, setError] = useState("");
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";
  return <details className="relative">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-[#e3d7c3] bg-[#f6eee2] px-4 text-sm font-medium text-[#06451d]">{name}<span aria-hidden="true">⌄</span></summary>
    <div className="absolute right-0 z-40 mt-2 w-64 rounded-[14px] border border-[#e3d7c3] bg-[#fef8f3] p-4 text-[#1b3022] shadow-lg">
      <p className="break-words text-sm font-semibold">{name}</p>
      {user?.primaryEmailAddress?.emailAddress && <p className="mt-1 break-all text-xs text-[#35594a]">{user.primaryEmailAddress.emailAddress}</p>}
      <a href={returnToInvite ? "/account?return_to=invite" : "/account"} className="mt-3 block border-t border-[#e3d7c3] py-3 text-sm">Account &amp; profile</a>
      <button type="button" onClick={() => void signOut({ redirectUrl: "/sign-in" }).catch(() => setError("Could not sign out. Please try again."))} className="text-sm text-[#9e2a2b]">Sign out</button>
      {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
    </div>
  </details>;
}
