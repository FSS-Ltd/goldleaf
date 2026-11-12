import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthShell } from "@/components/portal/AuthShell";

export const metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <AuthShell><div><h1>Account creation unavailable</h1><p>Please try again later.</p></div></AuthShell>;
  }
  return <AuthShell>
    <Suspense><SignUp forceRedirectUrl="/invite/accept" signInUrl="/sign-in?redirect_url=%2Finvite%2Faccept" appearance={{
      variables: {
        colorPrimary: "var(--color-ink)", colorPrimaryForeground: "var(--color-paper)", colorBackground: "var(--color-paper)",
        colorBorder: "var(--color-line)", colorForeground: "var(--color-ink)", fontFamily: "var(--font-sans)",
        fontFamilyButtons: "var(--font-sans)", borderRadius: "var(--radius-card)",
      },
      elements: { headerTitle: { fontFamily: "var(--font-display)" } },
    }} /></Suspense>
  </AuthShell>;
}
