import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { Suspense } from "react";
import { MessageWorkspace } from "@/components/portal/messages/MessageWorkspace";
export const metadata = { title: "Messages" };
type Props = { searchParams: Promise<{ family?: string; view?: string }> };
async function Data({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <MessageWorkspace role="admin" family={params.family} view={params.view} />
  );
}
export default function Page(props: Props) {
  return (
    <Suspense
      fallback={
        <PortalLoading label="Opening messages…" variant="messages" />
      }
    >
      <Data {...props} />
    </Suspense>
  );
}
