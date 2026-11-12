import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { verifiedIdentity, type PortalIdentity } from "./verified-identity";

export async function getPortalIdentity(): Promise<PortalIdentity | null> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) return null;
  return verifiedIdentity(await currentUser());
}
