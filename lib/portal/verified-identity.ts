export type PortalIdentity = { userId: string; verifiedEmails: string[] };

type User = {
  id: string;
  emailAddresses: { emailAddress: string; verification: { status: string } | null }[];
};

export function verifiedIdentity(user: User | null): PortalIdentity | null {
  if (!user?.id) return null;
  const verifiedEmails = user.emailAddresses
    .filter((email) => email.emailAddress && email.verification?.status === "verified")
    .map((email) => email.emailAddress);
  return verifiedEmails.length ? { userId: user.id, verifiedEmails } : null;
}

export type PortalSession =
  | { status: "signed-out" }
  | { status: "unverified" }
  | { status: "verified"; identity: PortalIdentity };

export function portalSessionState(userId: string | null, user: User | null): PortalSession {
  if (!userId) return { status: "signed-out" };
  const identity = verifiedIdentity(user);
  if (!identity || identity.userId !== userId) return { status: "unverified" };
  return { status: "verified", identity };
}
