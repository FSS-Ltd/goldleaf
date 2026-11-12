import { Suspense } from "react";
import { AuthShell } from "@/components/portal/AuthShell";
import { SignUpForm } from "@/components/portal/auth/SignUpForm";

export const metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <AuthShell><div><h1>Account creation unavailable</h1><p>Please try again later.</p></div></AuthShell>;
  }
  return <AuthShell>
    <Suspense><SignUpForm /></Suspense>
  </AuthShell>;
}
