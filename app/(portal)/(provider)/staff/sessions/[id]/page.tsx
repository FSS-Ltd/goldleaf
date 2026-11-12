import { Suspense } from "react";
import { SessionWorkspace } from "@/components/portal/learning/SessionWorkspace";
export const metadata = {
  title: "Session workspace",
  robots: { index: false, follow: false },
};
async function Content({ params }: { params: Promise<{ id: string }> }) {
  return <SessionWorkspace id={(await params).id} role="staff" />;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="section wrap">Opening session…</main>}>
      <Content params={params} />
    </Suspense>
  );
}
