type StaffIdentity = { id: string; subject: string };
type ProviderUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: { id: string; emailAddress: string; verification: { status: string | null } | null }[];
};

export function staffProfile(staff: StaffIdentity, user: ProviderUser | undefined) {
  if (!user || user.id !== staff.subject) return { id: staff.id, name: null, email: null };
  const verified = user.emailAddresses.filter((entry) => entry.verification?.status === "verified");
  const email = verified.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ?? verified[0]?.emailAddress ?? null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null;
  return { id: staff.id, name, email };
}
