import { SignIn, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

async function SignInContent() {
  const { userId } = await auth();
  if (userId) return <UserButton />;
  return <SignIn appearance={{
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

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <div className="section"><h1>Sign in unavailable</h1><p>Please try again later.</p></div>;
  }
  return <div className="section flex justify-center"><Suspense><SignInContent /></Suspense></div>;
}
