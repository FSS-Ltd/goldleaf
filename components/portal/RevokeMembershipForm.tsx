"use client";

import { useActionState } from "react";
import { OnboardingActorFields } from "@/lib/portal/onboarding-form-controls";
import type { ActionActor } from "@/lib/portal/action-actor";
import type { OnboardingActionState } from "@/lib/portal/onboarding-form-state";

export function RevokeMembershipForm({ actor, role, label, revoke }: {
  actor: ActionActor;
  role: "parent" | "staff";
  label: string;
  revoke: (state: OnboardingActionState, form: FormData) => Promise<OnboardingActionState>;
}) {
  const [state, action, pending] = useActionState(revoke, { status: "idle", message: "" });
  return (
    <form action={action} className="mt-4 space-y-3">
      <OnboardingActorFields actor={actor} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" value="yes" required disabled={pending} className="mt-1" />
        <span>I understand that removing {label} {role === "staff" ? "also removes all their family assignments" : "removes their access to this family"}.</span>
      </label>
      <button className="min-h-12 rounded-lg border border-red-800 px-4 text-sm font-medium text-red-800 disabled:opacity-60" disabled={pending}>
        {pending ? "Removing access…" : "Remove access"}
      </button>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p>}
    </form>
  );
}
