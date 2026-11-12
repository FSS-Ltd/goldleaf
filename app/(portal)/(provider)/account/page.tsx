import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/portal/AuthShell";
import { AccountProfile } from "@/components/portal/auth/AccountProfile";
import { getPortalSession } from "@/lib/portal/identity";

export const metadata = { title: "Account & profile", robots: { index: false, follow: false } };

async function AccountContent({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const session = await getPortalSession();
  if (session.status === "signed-out") redirect("/sign-in");
  const params = await searchParams;
  return <div className="w-full max-w-3xl"><a href={params.return_to === "invite" ? "/invite/accept" : "/portal"} className="mb-6 inline-block text-sm underline">{params.return_to === "invite" ? "Return to invitation" : "Return to portal"}</a><AccountProfile /></div>;
}

export default function AccountPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  return <AuthShell><Suspense fallback={<PortalLoading label="Loading your account…" variant="profile" contentOnly />}><AccountContent searchParams={searchParams} /></Suspense></AuthShell>;
}
