import "server-only";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireRole } from "./require-role";
import { matchesActionActor, type ActionActor } from "./action-actor-state";

export type { ActionActor };

/** Client values fence an old form; they never grant authority. */
export async function requireActionActor(
  input: unknown,
  role: "admin" | "staff",
): Promise<void> {
  const expected = z
    .object({ userId: z.string().min(1), authSessionId: z.string().min(1) })
    .strict()
    .parse(input);
  const [{ identity }, session] = await Promise.all([
    requireRole(role),
    auth(),
  ]);
  if (
    !matchesActionActor(
      expected,
      identity.userId,
      session.userId,
      session.sessionId,
    )
  ) {
    throw new Error("Session changed");
  }
}
