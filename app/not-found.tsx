import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ButtonLink } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { LostTiles } from "@/components/LostTiles";
import { SeedlingScene } from "@/components/seedling/SeedlingScene";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

const lostLetters = ["4", "0", "4"];
const links = [
  { href: "/how-we-teach", label: "How we teach" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/about", label: "About Goldleaf" },
  { href: "/enquire", label: "Enquire" },
];

export default function NotFound() {
  return (
    <>
    <Header />
    <main id="main" className="flex-1"><section className="section">
      <div className="wrap grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14">
        <div>
          <Eyebrow left>Error 404</Eyebrow>
          <h1 className="mt-4">This page has not sprouted yet</h1>
          <p className="prose-x mt-6 text-ink-soft">
            The link may be old, or the page may have moved. Everything we offer is a few clicks from the home page.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/">Back to the home page</ButtonLink>
            <ButtonLink href="/enquire" variant="ghost">Make an enquiry</ButtonLink>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="link-u font-semibold">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <SeedlingScene
          letters={lostLetters}
          maxGrowth={0.4}
          label="Three letter tiles reading 4, 0, 4 beside a small seedling"
          className="mx-auto aspect-square w-full max-w-sm md:max-w-none"
          poster={<LostTiles />}
        />
      </div>
    </section></main>
    <Footer />
    </>
  );
}
