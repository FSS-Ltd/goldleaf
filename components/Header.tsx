import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "./Button";

const nav = [
  { href: "/how-we-teach", label: "How we teach" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="border-b border-line bg-paper md:sticky md:top-0 md:z-40">
      <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link href="/" aria-label="Goldleaf Learning, home" className="block transition-transform duration-200 hover:-rotate-1 hover:scale-[1.03]">
          <Image
            src="/brand/goldleaf-wordmark-trim.webp"
            alt="Goldleaf Learning"
            width={1482}
            height={435}
            priority
            sizes="(min-width: 768px) 150px, 135px"
            className="h-10 w-auto md:h-11"
          />
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full justify-between gap-x-5 text-[0.95rem] font-medium md:order-none md:w-auto md:gap-x-8 md:text-base">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="link-nav py-2">
              {n.label}
            </Link>
          ))}
        </nav>
        <ButtonLink href="/enquire" className="!min-h-11 !px-5 !py-2 text-[0.95rem]">
          Enquire
        </ButtonLink>
      </div>
    </header>
  );
}
