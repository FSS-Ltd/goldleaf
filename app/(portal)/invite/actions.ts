"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { acceptInvitation } from "@/lib/portal/invitations";
import { invitationInputSchema } from "@/lib/portal/schemas";
import { encodeInvitationCookie, parseInvitationCookie } from "@/lib/portal/invitation-cookie";

const cookieName = "goldleaf_invite";
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/invite" };

export async function exchangeInvitation(token: string, purpose: string): Promise<boolean> {
  const store = await cookies();
  const parsed = invitationInputSchema.safeParse({ token, purpose });
  if (!parsed.success) {
    store.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
    return false;
  }
  store.set(cookieName, encodeInvitationCookie(parsed.data), { ...cookieOptions, maxAge: 600 });
  return true;
}

export async function acceptPortalInvitation(): Promise<{ error: string }> {
  const store = await cookies();
  const invitation = parseInvitationCookie(store.get(cookieName)?.value);
  try {
    await acceptInvitation(invitation);
  } catch {
    return { error: "This invitation could not be accepted. Please check the link or ask for a new one." };
  }
  store.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
  redirect("/portal");
}
