import { Suspense } from "react";
import { MessageWorkspace } from "@/components/portal/messages/MessageWorkspace";
export const metadata = { title: "Messages" };
export default async function Page({ searchParams }: { searchParams: Promise<{ family?: string; view?: string }> }) {
 const params = await searchParams;
 return <Suspense fallback={<main className="section wrap"><p>Opening messages…</p></main>}><MessageWorkspace role="parent" family={params.family} view={params.view} /></Suspense>;
}
