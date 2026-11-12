import { Suspense } from "react";
import { ParentBilling } from "@/components/portal/invoices/ParentBilling";
async function Selected({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ family?: string }>;
}) {
  const [p, query] = await Promise.all([params, searchParams]);
  return <ParentBilling selected={p.invoiceId} family={query.family} />;
}
export const metadata = { title: "Invoice" };

export default function Page(props: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ family?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="section wrap">
          <p>Opening invoice…</p>
        </main>
      }
    >
      <Selected {...props} />
    </Suspense>
  );
}
