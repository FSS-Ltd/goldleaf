import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getPortalSession } from "@/lib/portal/identity";
import { VerifyEmailNotice } from "@/components/portal/VerifyEmailNotice";
import { AuthShell } from "@/components/portal/AuthShell";
import { authDestination } from "@/lib/portal/auth-destination";
import { SignInForm } from "@/components/portal/auth/SignInForm";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

async function SignInContent({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  const params = await searchParams;
  const destination = authDestination(params.redirect_url);
  const session = await getPortalSession();
  if (session.status === "verified") redirect(destination);
  if (session.status === "unverified") return <VerifyEmailNotice retryUrl={destination === "/invite/accept" ? "/invite/accept" : "/sign-in"} />;
  return <SignInForm destination={destination} />;
}

export default function SignInPage({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <AuthShell><div><h1>Sign in unavailable</h1><p>Please try again later.</p></div></AuthShell>;
  }
  return <AuthShell><Suspense><SignInContent searchParams={searchParams} /></Suspense></AuthShell>;
}
