import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getPortalSession } from "@/lib/portal/identity";
import { VerifyEmailNotice } from "@/components/portal/VerifyEmailNotice";
import { AuthShell } from "@/components/portal/AuthShell";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

async function SignInContent({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  const params = await searchParams;
  const destination = params.redirect_url === "/invite/accept" ? "/invite/accept" : "/portal";
  const session = await getPortalSession();
  if (session.status === "verified") redirect(destination);
  if (session.status === "unverified") return <VerifyEmailNotice retryUrl={destination === "/invite/accept" ? "/invite/accept" : "/sign-in"} />;
  return <SignIn forceRedirectUrl={destination} appearance={{
    variables: {
      colorPrimary: "var(--color-ink)",
      colorPrimaryForeground: "var(--color-paper)",
      colorBackground: "var(--color-paper)",
      colorBorder: "var(--color-line)",
      colorForeground: "var(--color-ink)",
      fontFamily: "var(--font-sans)",
      fontFamilyButtons: "var(--font-sans)",
      borderRadius: "var(--radius-card)",
    },
    elements: {
      headerTitle: { fontFamily: "var(--font-display)" },
      footerAction: { display: "none" },
    },
  }} />;
}

export default function SignInPage({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <AuthShell><div><h1>Sign in unavailable</h1><p>Please try again later.</p></div></AuthShell>;
  }
  return <AuthShell><Suspense><SignInContent searchParams={searchParams} /></Suspense></AuthShell>;
}
