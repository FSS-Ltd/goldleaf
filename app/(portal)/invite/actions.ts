"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { acceptInvitation } from "@/lib/portal/invitations";
import { invitationInputSchema } from "@/lib/portal/schemas";

const cookieName = "goldleaf_invite";
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/invite" };

export async function exchangeInvitation(token: string, purpose: string): Promise<boolean> {
  const store = await cookies();
  const parsed = invitationInputSchema.safeParse({ token, purpose });
  if (!parsed.success || parsed.data.purpose !== "parent") {
    store.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
    return false;
  }
  store.set(cookieName, parsed.data.token, { ...cookieOptions, maxAge: 600 });
  return true;
}

export async function acceptParentInvitation(): Promise<{ error: string }> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  try {
    await acceptInvitation({ token, purpose: "parent" });
  } catch {
    return { error: "This invitation could not be accepted. Please check the link or ask for a new one." };
  }
  store.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
  redirect("/portal");
}
