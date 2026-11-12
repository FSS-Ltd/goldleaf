import Image from "next/image";

export function GoogleButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return <button type="button" aria-label="Sign in with Google" disabled={pending} onClick={onClick} className="flex w-full justify-center rounded-lg disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06451d]">
    <Image src="/brand/google-signin-light.png" width={180} height={40} alt="" />
  </button>;
}
