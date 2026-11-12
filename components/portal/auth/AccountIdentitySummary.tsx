import { UserRound } from "lucide-react";

export function AccountIdentitySummary({ user, pending, connectGoogle }: {
  user: {
    fullName: string | null;
    primaryEmailAddress: { emailAddress: string; verification: { status: string | null } | null } | null;
    externalAccounts: { provider: string; emailAddress: string; verification: { status: string | null } | null }[];
  };
  pending: boolean;
  connectGoogle: () => void;
}) {
  const name = user.fullName?.trim() || "Your account";
  const primary = user.primaryEmailAddress;
  const google = user.externalAccounts.find((account) => account.provider === "google");
  return <section aria-labelledby="account-identity-title" className="mt-6 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
    <div className="flex items-center gap-4">
      <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#06451d] text-[#fef8f3]"><UserRound size={24} /></span>
      <h2 id="account-identity-title" className="font-display !text-xl text-[#06451d]">{name}</h2>
    </div>
    <dl className="mt-5 space-y-4 border-t border-[#e3d7c3] pt-5 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-5">
        <dt className="font-medium text-[#35594a]">Primary email</dt>
        <dd className="min-w-0 sm:text-right">{primary ? <><span className="block whitespace-nowrap text-[#35594a]">{primary.verification?.status === "verified" ? "Verified" : "Not verified"}</span><span className="block [overflow-wrap:anywhere]">{primary.emailAddress}</span></> : "Not set"}</dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-5">
        <dt className="font-medium text-[#35594a]">Google account</dt>
        <dd className="min-w-0 sm:text-right">{google ? <><span className="block whitespace-nowrap">{google.verification?.status === "verified" ? "Connected" : "Verification pending"}</span>{google.emailAddress && <span className="block [overflow-wrap:anywhere]">{google.emailAddress}</span>}</> : "Not connected"}</dd>
      </div>
    </dl>
    {!google && <button type="button" disabled={pending} onClick={connectGoogle} className="mt-4 rounded-lg bg-[#06451d] px-4 py-3 text-sm font-medium text-white disabled:opacity-60">Connect Google</button>}
  </section>;
}
