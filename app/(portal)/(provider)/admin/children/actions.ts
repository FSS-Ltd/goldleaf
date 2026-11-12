"use server";

import { revalidatePath } from "next/cache";
import { createChild } from "@/lib/portal/children";
import { scheduleSession } from "@/lib/portal/sessions";
import { ukLocalToIso } from "@/lib/portal/uk-time";
import { requireActionActor } from "@/lib/portal/action-actor";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function registerChild(
  _: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    await requireActionActor(
      {
        userId: form.get("actorUserId"),
        authSessionId: form.get("actorSessionId"),
      },
      "admin",
    );
    await createChild({
      id: form.get("id"),
      familyId: form.get("familyId"),
      name: form.get("name"),
    });
  } catch {
    return {
      status: "error",
      message:
        "Could not register this child. Check the details and refresh before trying again.",
    };
  }
  revalidatePath("/admin/children");
  return { status: "success", message: "Child registered." };
}

export async function createSession(
  _: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    await requireActionActor(
      {
        userId: form.get("actorUserId"),
        authSessionId: form.get("actorSessionId"),
      },
      "admin",
    );
    const date = form.get("date");
    const time = form.get("time");
    if (typeof date !== "string" || typeof time !== "string")
      throw new Error("Invalid time");
    const startsAt = ukLocalToIso(date, time);
    const location = form.get("location");
    await scheduleSession({
      id: form.get("id"),
      childId: form.get("childId"),
      startsAt,
      locationLabel:
        typeof location === "string" && location.trim() ? location : null,
    });
  } catch {
    return {
      status: "error",
      message:
        "Could not schedule the session. Check the details; UK clock-change times may be missing or occur twice.",
    };
  }
  revalidatePath("/admin/children");
  revalidatePath("/staff");
  revalidatePath("/parent/sessions");
  return { status: "success", message: "Session scheduled." };
}
