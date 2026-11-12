import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRole } from "@/lib/portal/require-role";
import { readFamily } from "@/lib/portal/families";

async function ParentHome() {
  const { identity, memberships } = await requireRole("parent");
  const familyIds = memberships.filter((membership) => membership.role === "parent").map((membership) => membership.family_id);
  const families = (await Promise.all(familyIds.map(readFamily))).filter((family) => family !== null);
  if (!families.length) return <PortalShell role="parent" userId={identity.userId}><h1>Your family portal</h1><p className="mt-4">Your family details are unavailable. Please ask Deborah for help.</p></PortalShell>;
  const cards = [
    { title: "Next session", body: "Sessions are not available here yet." },
    { title: "Tutor notes", body: "Tutor notes are not available here yet." },
    { title: "Learning", body: "Learning updates are not available here yet." },
    { title: "Billing", body: "Billing is not available here yet." },
  ];
  return <PortalShell role="parent" userId={identity.userId}>
    <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Your family portal</h1>
    {families.length > 1 && <p className="mt-3 text-sm text-[#35594a]">{families.map((family) => family.display_name ?? "Family").join(" · ")}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      {cards.map((card, index) => <section key={card.title} className={`min-h-36 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 ${index % 2 === 0 ? "lg:col-span-2" : ""}`}>
        <h2 className="!font-sans !text-base font-medium">{card.title}</h2><p className="mt-6 text-sm text-[#35594a]">{card.body}</p>
      </section>)}
    </div>
  </PortalShell>;
}
export default function ParentPage() { return <Suspense fallback={<main className="section wrap"><p>Opening your family portal…</p></main>}><ParentHome /></Suspense>; }
