import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerk = clerkMiddleware();

export default function proxy(...args: Parameters<typeof clerk>) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }
  return clerk(...args);
}

export const config = {
  matcher: ["/parent/:path*", "/staff/:path*", "/admin/:path*", "/sign-in/:path*", "/sign-up/:path*", "/invite/accept/:path*", "/api/portal/:path*", "/__clerk/:path*"],
};
