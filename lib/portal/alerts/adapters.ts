import { z } from "zod";
import { verifiedIdentity } from "../verified-identity";
import type { IdentityLookup, MailSubmit } from "./model";

const clerkUser = z.object({ id: z.string(), email_addresses: z.array(z.object({ email_address: z.string(), verification: z.object({ status: z.string() }).nullable() })) });

export function clerkIdentity(key: string): IdentityLookup {
  return async (subject, signal) => {
    if (!/^[A-Za-z0-9_-]+$/.test(subject)) return null;
    const response = await fetch(`https://api.clerk.com/v1/users/${subject}`, { headers: { Authorization: `Bearer ${key}` }, signal });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Identity provider unavailable");
    const data = clerkUser.parse(await response.json());
    const identity = verifiedIdentity({ id: data.id, emailAddresses: data.email_addresses.map((email) => ({ emailAddress: email.email_address, verification: email.verification })) });
    return identity?.userId === subject ? identity.verifiedEmails : null;
  };
}

export function resendSubmit(key: string): MailSubmit {
  return async (payload, idempotencyKey, signal) => {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload), signal });
    return response.ok ? "sent" : "retry";
  };
}
