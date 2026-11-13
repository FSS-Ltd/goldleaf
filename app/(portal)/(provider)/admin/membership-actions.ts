"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActionActor } from "@/lib/portal/action-actor";
import { listFamilyMemberships, revokeMembership } from "@/lib/portal/families";
import { listStaffProfiles, membershipProfiles } from "@/lib/portal/staff-profiles";
import { removeScopedMembership, type MembershipScope } from "@/lib/portal/membership-target";
import type { OnboardingActionState } from "@/lib/portal/onboarding-form-state";

export async function revokeAcceptedMember(
  scope: MembershipScope,
  _previous: OnboardingActionState,
  form: FormData,
): Promise<OnboardingActionState> {
  try {
    const actor = { userId: form.get("actorUserId"), authSessionId: form.get("actorSessionId") };
    const removed = await removeScopedMembership(scope, form.get("confirm"), {
      authorize: () => requireActionActor(actor, "admin"),
      parents: async (familyId) => membershipProfiles((await listFamilyMemberships(familyId)).filter((member) => member.role === "parent")),
      staff: listStaffProfiles,
      revoke: revokeMembership,
    });
    if (!removed) {
      return { status: "error", message: "Access could not be confirmed. Refresh the page to check whether it was already removed." };
    }
    revalidatePath(scope.role === "parent" ? `/admin/families/${scope.familyId}` : "/admin/staff");
  } catch {
    return { status: "error", message: "Access could not be removed or confirmed. Refresh the page and check before trying again." };
  }
  redirect(scope.role === "parent" ? `/admin/families/${scope.familyId}?access=removed` : "/admin/staff?access=removed");
}
