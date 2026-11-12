import { Suspense } from "react";
import { AuthShell } from "@/components/portal/AuthShell";
import { SsoCallback } from "@/components/portal/auth/SsoCallback";
import { authDestination } from "@/lib/portal/auth-destination";

export const metadata = { title: "Completing sign in", robots: { index: false, follow: false } };

async function CallbackContent({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  const params = await searchParams;
  return <SsoCallback destination={authDestination(params.destination)} />;
}

export default function SsoCallbackPage({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <AuthShell><div><h1>Sign in unavailable</h1><p>Please try again later.</p></div></AuthShell>;
  }
  return <AuthShell><Suspense fallback={<p>Completing sign in…</p>}><CallbackContent searchParams={searchParams} /></Suspense></AuthShell>;
}
