import { invitationInputSchema } from "./schemas";

type Invitation = { token: string; purpose: "parent" | "staff" };

export function encodeInvitationCookie(invitation: Invitation): string {
  const value = invitationInputSchema.parse(invitation);
  return `${value.purpose}:${value.token}`;
}

export function parseInvitationCookie(value: string | undefined): Invitation | null {
  if (!value) return null;
  const parts = value.includes(":") ? value.split(":") : ["parent", value];
  if (parts.length !== 2) return null;
  const parsed = invitationInputSchema.safeParse({ purpose: parts[0], token: parts[1] });
  return parsed.success ? parsed.data : null;
}
