import { UserButton } from "@clerk/nextjs";

export function VerifyEmailNotice({ retryUrl }: { retryUrl: "/sign-in" | "/invite/accept" }) {
  return <div className="w-full max-w-md rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 text-[#06451d] md:p-8">
    <div className="flex items-start justify-between gap-4"><h1>Verify your email</h1><UserButton /></div>
    <p className="mt-4 text-[#35594a]">Your account needs a verified email to access Goldleaf. Open your account to verify an email, then try again. You can also sign out and use a different account.</p>
    <a href={retryUrl} className="mt-6 inline-block rounded-lg bg-[#06451d] px-5 py-3 font-medium text-white">Try again</a>
  </div>;
}
