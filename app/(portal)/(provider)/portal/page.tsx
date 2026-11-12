import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getPortalIdentity } from "@/lib/portal/identity";
import { getActiveMemberships } from "@/lib/portal/access";

async function PortalLanding() {
  if (!await getPortalIdentity()) redirect("/sign-in");
  const memberships = await getActiveMemberships();
  if (memberships.some((item) => item.role === "admin")) redirect("/admin");
  if (memberships.some((item) => item.role === "parent")) redirect("/parent");
  if (memberships.some((item) => item.role === "staff")) redirect("/staff");
  return <main id="main" className="section wrap"><h1>Portal access unavailable</h1><p className="mt-4">Please ask Deborah about your invitation.</p></main>;
}
export default function PortalPage() { return <Suspense fallback={<main className="section wrap"><p>Opening your portal…</p></main>}><PortalLanding /></Suspense>; }
