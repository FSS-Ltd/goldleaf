import { Suspense } from "react";
import { AccountMenu } from "@/components/portal/auth/AccountMenu";
import { PortalSessionGuard } from "@/components/portal/PortalSessionGuard";
import { requireRole } from "@/lib/portal/require-role";

async function StaffUnavailable() {
  const { identity } = await requireRole("staff");
  return <main id="main"><PortalSessionGuard userId={identity.userId} /><div className="section wrap"><div className="flex items-center justify-between gap-4"><h1>Staff portal</h1><AccountMenu /></div><p className="mt-4">The staff portal is not available yet.</p></div></main>;
}
export default function StaffPage() { return <Suspense fallback={<main className="section wrap"><p>Opening your portal…</p></main>}><StaffUnavailable /></Suspense>; }
