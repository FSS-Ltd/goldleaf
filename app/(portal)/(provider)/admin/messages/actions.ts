"use server";

import { z } from "zod";
import { requireActionActor } from "@/lib/portal/action-actor";
import { markMessagesAsRole, sendMessageAsRole } from "@/lib/portal/message-views";
import { requestSessionChange, resolveSessionChange } from "@/lib/portal/messages";
import { ukLocalToIso } from "@/lib/portal/uk-time";

const roleSchema = z.enum(["admin", "parent", "staff"]);
export async function sendMessageAction(actor: unknown, role: unknown, input: unknown): Promise<{ ok: boolean }> {
 try { const selected = roleSchema.parse(role); await requireActionActor(actor, selected); await sendMessageAsRole(selected, input); return { ok: true }; } catch { return { ok: false }; }
}
export async function markMessageAction(actor: unknown, role: unknown, input: unknown): Promise<boolean> {
 try { const selected = roleSchema.parse(role); await requireActionActor(actor, selected); await markMessagesAsRole(selected, input); return true; } catch { return false; }
}
export async function requestChangeAction(actor: unknown, input: unknown): Promise<{ ok: boolean }> {
 try { await requireActionActor(actor, "parent"); await requestSessionChange(input); return { ok: true }; } catch { return { ok: false }; }
}
const resolutionSchema = z.object({ requestId: z.string().uuid(), resolution: z.string().trim().min(1).max(4000), mode: z.enum(["keep", "reschedule"]), date: z.string(), time: z.string() }).strict();
export async function resolveRequestAction(actor: unknown, input: unknown): Promise<{ ok: boolean }> {
 try { await requireActionActor(actor, "admin"); const value = resolutionSchema.parse(input); const newStart = value.mode === "reschedule" ? ukLocalToIso(value.date, value.time) : null; await resolveSessionChange({ requestId: value.requestId, resolution: value.resolution, newStart }); return { ok: true }; } catch { return { ok: false }; }
}
