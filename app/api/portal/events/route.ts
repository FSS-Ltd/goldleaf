import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getPortalIdentity } from "@/lib/portal/identity";
import { openPortalEventStream } from "@/lib/portal/events-server";

export async function GET(request: Request): Promise<Response> {
  const role = z.enum(["admin", "parent", "staff"]).safeParse(new URL(request.url).searchParams.get("role"));
  if (!role.success) return new Response(null, { status: 400 });
  const identity = await getPortalIdentity();
  if (!identity) return new Response(null, { status: 401 });
  const session = await auth();
  const expiry = session.sessionClaims?.exp;
  if (
    !identity ||
    session.userId !== identity.userId ||
    typeof expiry !== "number"
  )
    return new Response(null, { status: 401 });
  return openPortalEventStream(identity.userId, role.data, expiry, request.signal);
}
