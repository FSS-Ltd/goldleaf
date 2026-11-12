"use server";

import { revalidatePath } from "next/cache";
import { createChild } from "@/lib/portal/children";
import { scheduleSession } from "@/lib/portal/sessions";
import { ukLocalToIso } from "@/lib/portal/uk-time";
import { requireActionActor } from "@/lib/portal/action-actor";

import type { AdminActionState } from "@/lib/portal/admin-form-state";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function registerChild(
  previous: AdminActionState,
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
      revision: previous.revision,
      values: { name: text(form, "name") },
    };
  }
  revalidatePath("/admin/children");
  return {
    status: "success",
    message: "Child registered.",
    revision: previous.revision + 1,
  };
}

export async function createSession(
  previous: AdminActionState,
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
      revision: previous.revision,
      values: {
        childId: text(form, "childId"),
        date: text(form, "date"),
        time: text(form, "time"),
        location: text(form, "location"),
      },
    };
  }
  revalidatePath("/admin/children");
  revalidatePath("/staff");
  revalidatePath("/parent/sessions");
  return {
    status: "success",
    message: "Session scheduled.",
    revision: previous.revision + 1,
  };
}
