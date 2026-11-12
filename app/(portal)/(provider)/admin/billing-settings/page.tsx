import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { BillingSettingsForm } from "@/components/portal/invoices/BillingSettingsForm";
import { readBillingSettings } from "@/lib/portal/billing-settings";
import { requireRole } from "@/lib/portal/require-role";
async function Settings() {
  const { identity, memberships } = await requireRole("admin");
  const settings = await readBillingSettings();
  return (
    <PortalShell
      role="admin"
      userId={identity.userId}
      memberships={memberships}
      section="settings"
    >
      <Link href="/admin/invoices" className="text-sm underline">
        Back to invoices
      </Link>
      <h1 className="my-6 !text-[clamp(2rem,4vw,2.6rem)]">Billing settings</h1>
      <BillingSettingsForm settings={settings} showHeading={false} />
    </PortalShell>
  );
}
export const metadata = { title: "Billing settings" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <PortalLoading label="Opening settings…" variant="list" />
      }
    >
      <Settings />
    </Suspense>
  );
}
