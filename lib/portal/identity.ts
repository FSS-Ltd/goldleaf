import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { portalSessionState, type PortalIdentity, type PortalSession } from "./verified-identity";

export async function getPortalSession(): Promise<PortalSession> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) return { status: "signed-out" };
  const { userId } = await auth();
  return portalSessionState(userId, userId ? await currentUser() : null);
}

export async function getPortalIdentity(): Promise<PortalIdentity | null> {
  const session = await getPortalSession();
  return session.status === "verified" ? session.identity : null;
}
