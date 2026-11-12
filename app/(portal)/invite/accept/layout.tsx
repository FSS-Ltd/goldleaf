import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export default function InviteProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) return children;
  return <ClerkProvider>{children}</ClerkProvider>;
}
