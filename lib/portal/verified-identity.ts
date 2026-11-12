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
