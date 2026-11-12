"use client";

import { useActionState } from "react";
import { acceptParentInvitation } from "@/app/(portal)/invite/actions";

export function InviteAcceptForm() {
  const [state, action, pending] = useActionState(acceptParentInvitation, { error: "" });
  return <form action={action} className="mt-8">
    {state.error && <p role="alert" className="mb-4 text-sm text-red-800">{state.error}</p>}
    <button disabled={pending} className="min-h-12 w-full rounded-lg bg-[#06451d] px-5 py-3 font-medium text-white disabled:opacity-60">{pending ? "Accepting…" : "Accept invitation"}</button>
  </form>;
}
