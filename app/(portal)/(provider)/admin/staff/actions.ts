"use server";

import { revalidatePath } from "next/cache";
import { deliverStaffInvitation, issueStaffInvitation, revokeStaffInvitation, setStaffAssignments } from "@/lib/portal/staff";

export type StaffActionState = { status: "idle" | "success" | "error"; message: string };

export async function sendStaffInvite(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  let issued: Awaited<ReturnType<typeof issueStaffInvitation>>;
  try {
    issued = await issueStaffInvitation({ email: form.get("email") }, String(form.get("requestId") ?? ""));
  } catch {
    return { status: "error", message: "The invitation could not be created. Check the staff list before trying again." };
  }
  revalidatePath("/admin/staff");
  try {
    const delivery = await deliverStaffInvitation(issued.invitationId, issued.token);
    revalidatePath("/admin/staff");
    return delivery === "sent" ? { status: "success", message: "Invitation sent." } : { status: "error", message: "The invitation was created but email failed. Resend it from the staff list." };
  } catch {
    return { status: "error", message: "The invitation was created, but delivery could not be confirmed. Check its status before resending." };
  }
}

export async function revokeStaffInvite(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  try { await revokeStaffInvitation(String(form.get("invitationId") ?? "")); }
  catch { return { status: "error", message: "The invitation could not be revoked." }; }
  revalidatePath("/admin/staff");
  return { status: "success", message: "Invitation revoked." };
}

export async function saveStaffAssignments(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  try { await setStaffAssignments(String(form.get("staffId") ?? ""), form.getAll("familyId")); }
  catch { return { status: "error", message: "Family access could not be saved. Refresh the page and try again." }; }
  revalidatePath("/admin/staff");
  revalidatePath("/staff");
  return { status: "success", message: "Family access saved." };
}
