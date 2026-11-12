import { Suspense } from "react";
import { ParentBilling } from "@/components/portal/invoices/ParentBilling";
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="section wrap">
          <p>Opening invoices…</p>
        </main>
      }
    >
      <ParentBilling />
    </Suspense>
  );
}
