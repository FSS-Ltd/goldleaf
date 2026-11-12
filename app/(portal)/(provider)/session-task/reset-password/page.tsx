import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { Suspense } from "react";
import { AuthShell } from "@/components/portal/AuthShell";
import { ResetPasswordTask } from "@/components/portal/auth/ResetPasswordTask";
import { authDestination } from "@/lib/portal/auth-destination";

export const metadata = { title: "Account security", robots: { index: false, follow: false } };

async function TaskContent({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  const params = await searchParams;
  return <ResetPasswordTask destination={authDestination(params.destination)} />;
}

export default function ResetTaskPage({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <AuthShell><div><h1>Account security unavailable</h1><p>Please try again later.</p></div></AuthShell>;
  }
  return <AuthShell><Suspense fallback={<PortalLoading label="Loading your account…" variant="account" contentOnly />}><TaskContent searchParams={searchParams} /></Suspense></AuthShell>;
}
