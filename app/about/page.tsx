import { Suspense } from "react";
import { LiveCtaBand } from "@/components/FoundingContent";
import type { Metadata } from "next";
import { CtaBand } from "@/components/CtaBand";
import { Eyebrow } from "@/components/Eyebrow";
import { JsonLd } from "@/components/JsonLd";
import { SafeHands } from "@/components/SafeHands";
import { site } from "@/content/site";
import { breadcrumbSchema } from "@/lib/schema-org";

export const metadata: Metadata = {
  title: "About Goldleaf",
  description:
    "Goldleaf is a Christian-run early learning business in Ashford, Kent. Meet your tutor and see how one reading path runs through everything we do.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About Goldleaf", url: "/about", images: ["/opengraph-image.png"] },
};

export default function About() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "About", path: "/about" }])} />

      <section className="section">
        <div className="wrap grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <div
            aria-hidden="true"
            className="grid size-40 place-items-center rounded-full bg-paper-deep font-display text-5xl ring-2 ring-gold md:size-52"
          >
            {site.tutor.initials}
          </div>
          <div>
            <Eyebrow left>About</Eyebrow>
            <h1 className="mt-4">Meet {site.tutor.firstName}, your Goldleaf tutor</h1>
            <p className="prose-x mt-6 text-ink-soft">{site.tutor.bio}</p>
          </div>
        </div>
      </section>

      <section className="section section-deep" aria-labelledby="why-title">
        <div className="wrap-4xl">
          <h2 id="why-title">Why Goldleaf</h2>
          <div className="prose-x mt-6 grid gap-4">
            <p>
              Goldleaf Learning has one idea at its centre: children read best when every adult around them teaches the
              same sounds in the same order. Tutoring, books and a home curriculum all follow one phonics path, so
              nothing your child learns has to be unlearned.
            </p>
            <p>
              Tutoring is the first part to open. Decodable phonics readers and a home learning programme for ages 2, 3
              and 4 are on the way.
            </p>
            <p>
              Goldleaf is a Christian-run business. Sessions are faith-neutral by default. If you would like it, an
              optional faith package of prayers, Bible stories and worship songs is available to use at home.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="safe-title">
        <div className="wrap">
          <Eyebrow left>Safe hands</Eyebrow>
          <h2 id="safe-title" className="mt-3">How sessions run safely</h2>
          <div className="mt-8"><SafeHands /></div>
        </div>
      </section>

      <Suspense fallback={<CtaBand availability={null} />}><LiveCtaBand /></Suspense>
    </>
  );
}
