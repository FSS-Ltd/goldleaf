import { Suspense } from "react";
import { MessageWorkspace } from "@/components/portal/messages/MessageWorkspace";
export const metadata = { title: "Messages" };
type Props = { searchParams: Promise<{ family?: string; view?: string }> };
async function Data({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <MessageWorkspace role="staff" family={params.family} view={params.view} />
  );
}
export default function Page(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="section wrap">
          <p>Opening messages…</p>
        </main>
      }
    >
      <Data {...props} />
    </Suspense>
  );
}
