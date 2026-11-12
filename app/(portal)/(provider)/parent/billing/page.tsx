import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { Suspense } from "react";
import { ParentBilling } from "@/components/portal/invoices/ParentBilling";
export const metadata = { title: "Invoices" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <PortalLoading label="Opening invoices…" variant="list" />
      }
    >
      <ParentBilling />
    </Suspense>
  );
}
