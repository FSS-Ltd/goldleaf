"use server";

import { revalidatePath } from "next/cache";
import { requireActionActor } from "@/lib/portal/action-actor";
import {
  nextOnboardingRevision,
  type OnboardingActionState,
} from "@/lib/portal/onboarding-form-state";
import {
  createFamilyWithInvitation,
  setFamilyFounding,
} from "@/lib/portal/families";
import {
  deliverParentInvitation,
  issueParentInvitation,
  revokeParentInvitation,
} from "@/lib/portal/invitation-delivery";

export type AdminActionState = OnboardingActionState;

function actor(form: FormData) {
  return {
    userId: form.get("actorUserId"),
    authSessionId: form.get("actorSessionId"),
  };
}
function values(form: FormData) {
  return {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    founding: form.get("founding") === "on",
  };
}

export async function createFamily(
  previous: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  let created: Awaited<ReturnType<typeof createFamilyWithInvitation>>;
  const submitted = values(form);
  try {
    await requireActionActor(actor(form), "admin");
    created = await createFamilyWithInvitation({
      familyId: form.get("familyId"),
      name: form.get("name"),
      email: form.get("email"),
      founding: form.get("founding") === "on",
    });
  } catch {
    return {
      status: "error",
      message:
        "We could not create the family. Check the details and the family list before trying again.",
      revision: previous.revision,
      values: submitted,
    };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/families/[familyId]", "page");
  revalidatePath("/");
  try {
    const delivery = await deliverParentInvitation(
      created.invitationId,
      created.token,
    );
    revalidatePath("/admin/families/[familyId]", "page");
    return delivery === "sent"
      ? {
          status: "success",
          message: "Family created and invitation sent.",
          committed: true,
          revision: nextOnboardingRevision(previous),
        }
      : {
          status: "error",
          message:
            "Family created, but the invitation could not be sent. Please resend it from the family list.",
          committed: true,
          revision: previous.revision,
          values: submitted,
        };
  } catch {
    return {
      status: "error",
      message:
        "Family created. The invitation delivery status could not be confirmed; check it before resending.",
      committed: true,
      revision: previous.revision,
      values: submitted,
    };
  }
}

export async function changeFounding(
  _previous: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const value = form.get("founding");
  if (value !== "true" && value !== "false")
    return { status: "error", message: "Choose a valid founding status." };
  try {
    await requireActionActor(actor(form), "admin");
    await setFamilyFounding({
      familyId: form.get("familyId"),
      founding: value === "true",
    });
  } catch {
    return {
      status: "error",
      message:
        "Founding status could not be changed. Check the available places and try again.",
    };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/families/[familyId]", "page");
  revalidatePath("/");
  return { status: "success", message: "Founding status updated." };
}

export async function resendInvitation(
  _previous: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    await requireActionActor(actor(form), "admin");
    const created = await issueParentInvitation(
      String(form.get("familyId") ?? ""),
      String(form.get("email") ?? ""),
      String(form.get("requestId") ?? ""),
    );
    revalidatePath("/admin");
    revalidatePath("/admin/families/[familyId]", "page");
    const delivery = await deliverParentInvitation(
      created.invitationId,
      created.token,
    );
    revalidatePath("/admin/families/[familyId]", "page");
    return delivery === "sent"
      ? {
          status: "success",
          message:
            "New invitation sent. Earlier invitations for this email no longer work.",
        }
      : {
          status: "error",
          message:
            "The new invitation could not be sent. Please try resending it.",
        };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/admin/families/[familyId]", "page");
    return {
      status: "error",
      message:
        "The invitation could not be sent or its status confirmed. Check the family list before trying again.",
    };
  }
}

export async function revokeInvitation(
  _previous: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    await requireActionActor(actor(form), "admin");
    await revokeParentInvitation(String(form.get("invitationId") ?? ""));
  } catch {
    return {
      status: "error",
      message: "The invitation could not be revoked. Please try again.",
    };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/families/[familyId]", "page");
  return { status: "success", message: "Invitation revoked." };
}
