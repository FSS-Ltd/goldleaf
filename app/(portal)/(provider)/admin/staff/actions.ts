"use server";

import { revalidatePath } from "next/cache";
import { requireActionActor } from "@/lib/portal/action-actor";
import {
  nextOnboardingRevision,
  type OnboardingActionState,
} from "@/lib/portal/onboarding-form-state";
import {
  deliverStaffInvitation,
  issueStaffInvitation,
  revokeStaffInvitation,
  setStaffAssignments,
} from "@/lib/portal/staff";

export type StaffActionState = OnboardingActionState;

function actor(form: FormData) {
  return {
    userId: form.get("actorUserId"),
    authSessionId: form.get("actorSessionId"),
  };
}

export async function sendStaffInvite(
  previous: StaffActionState,
  form: FormData,
): Promise<StaffActionState> {
  let issued: Awaited<ReturnType<typeof issueStaffInvitation>>;
  const values = { email: String(form.get("email") ?? "") };
  try {
    await requireActionActor(actor(form), "admin");
    issued = await issueStaffInvitation(
      { email: form.get("email") },
      String(form.get("requestId") ?? ""),
    );
  } catch {
    return {
      status: "error",
      message:
        "The invitation could not be created. Check the staff list before trying again.",
      revision: previous.revision,
      values,
    };
  }
  revalidatePath("/admin/staff");
  try {
    const delivery = await deliverStaffInvitation(
      issued.invitationId,
      issued.token,
    );
    revalidatePath("/admin/staff");
    return delivery === "sent"
      ? {
          status: "success",
          message: "Invitation sent.",
          revision: nextOnboardingRevision(previous),
        }
      : {
          status: "error",
          message:
            "The invitation was created but email failed. Resend it from the staff list.",
          revision: previous.revision,
          values,
        };
  } catch {
    return {
      status: "error",
      message:
        "The invitation was created, but delivery could not be confirmed. Check its status before resending.",
      revision: previous.revision,
      values,
    };
  }
}

export async function revokeStaffInvite(
  _previous: StaffActionState,
  form: FormData,
): Promise<StaffActionState> {
  try {
    await requireActionActor(actor(form), "admin");
    await revokeStaffInvitation(String(form.get("invitationId") ?? ""));
  } catch {
    return { status: "error", message: "The invitation could not be revoked." };
  }
  revalidatePath("/admin/staff");
  return { status: "success", message: "Invitation revoked." };
}

export async function saveStaffAssignments(
  _previous: StaffActionState,
  form: FormData,
): Promise<StaffActionState> {
  try {
    await requireActionActor(actor(form), "admin");
    await setStaffAssignments(
      String(form.get("staffId") ?? ""),
      form.getAll("familyId"),
    );
  } catch {
    return {
      status: "error",
      message:
        "Family access could not be saved. Refresh the page and try again.",
      values: {
        familyIds: form
          .getAll("familyId")
          .filter((value): value is string => typeof value === "string"),
      },
    };
  }
  revalidatePath("/admin/staff");
  revalidatePath("/staff");
  return { status: "success", message: "Family access saved." };
}
