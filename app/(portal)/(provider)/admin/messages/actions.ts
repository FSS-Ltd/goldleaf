"use server";

import { z } from "zod";
import { requireActionActor } from "@/lib/portal/action-actor";
import {
  markMessagesAsRole,
  sendMessageAsRole,
  resolveRequestChecked,
} from "@/lib/portal/message-views";
import { requestSessionChange } from "@/lib/portal/messages";
import { ukLocalToIso } from "@/lib/portal/uk-time";

type Role = "admin" | "parent" | "staff";
async function sendForRole(
  role: Role,
  actor: unknown,
  input: unknown,
): Promise<{ ok: boolean }> {
  try {
    await requireActionActor(actor, role);
    await sendMessageAsRole(role, input);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
async function markForRole(
  role: Role,
  actor: unknown,
  input: unknown,
): Promise<boolean> {
  try {
    await requireActionActor(actor, role);
    await markMessagesAsRole(role, input);
    return true;
  } catch {
    return false;
  }
}
export async function sendParentMessage(actor: unknown, input: unknown) {
  return sendForRole("parent", actor, input);
}
export async function sendStaffMessage(actor: unknown, input: unknown) {
  return sendForRole("staff", actor, input);
}
export async function sendAdminMessage(actor: unknown, input: unknown) {
  return sendForRole("admin", actor, input);
}
export async function markParentMessages(actor: unknown, input: unknown) {
  return markForRole("parent", actor, input);
}
export async function markStaffMessages(actor: unknown, input: unknown) {
  return markForRole("staff", actor, input);
}
export async function markAdminMessages(actor: unknown, input: unknown) {
  return markForRole("admin", actor, input);
}
export async function requestChangeAction(
  actor: unknown,
  input: unknown,
): Promise<{ ok: boolean }> {
  try {
    await requireActionActor(actor, "parent");
    await requestSessionChange(input);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
const resolutionSchema = z
  .object({
    requestId: z.string().uuid(),
    resolution: z.string().trim().min(1).max(4000),
    mode: z.enum(["keep", "reschedule"]),
    date: z.string().max(20),
    time: z.string().max(20),
    expectedStart: z.iso.datetime({ offset: true }),
    expectedStatus: z.enum([
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
    ]),
  })
  .strict();
export async function resolveRequestAction(
  actor: unknown,
  input: unknown,
): Promise<{ ok: boolean; stale: boolean }> {
  try {
    await requireActionActor(actor, "admin");
    const value = resolutionSchema.parse(input);
    const newStart =
      value.mode === "reschedule" ? ukLocalToIso(value.date, value.time) : null;
    await resolveRequestChecked({
      requestId: value.requestId,
      resolution: value.resolution,
      newStart,
      expectedStart: value.expectedStart,
      expectedStatus: value.expectedStatus,
    });
    return { ok: true, stale: false };
  } catch (error) {
    const stale =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "40001";
    return { ok: false, stale };
  }
}
