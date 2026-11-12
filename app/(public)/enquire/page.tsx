import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiryPrice, EnquiryPriceText } from "@/components/FoundingContent";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Eyebrow } from "@/components/Eyebrow";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/content/site";
import { breadcrumbSchema } from "@/lib/schema-org";

export const metadata: Metadata = {
  title: "Enquire about tutoring",
  description:
    "Ask about a place with Goldleaf Tutoring in Ashford, Kent. A short form, a reply within 2 working days, then a chat.",
  alternates: { canonical: "/enquire" },
  openGraph: { title: "Enquire about tutoring", url: "/enquire", images: ["/opengraph-image.png"] },
};

const steps = [
  { n: "1", t: "You send an enquiry", d: "Tell us your child's age and the days you would like." },
  { n: "2", t: "We have a chat", d: `${site.tutor.firstName} replies within 2 working days to talk it through.` },
  { n: "3", t: "A short play-based check", d: "A relaxed first visit so we know where your child's learning begins." },
  { n: "4", t: "An All About Me form", d: "Before the first session you share your child's words, routines and comforters, and a few printed photos." },
];

export default function Enquire() {
  return (
    <section className="section">
      <JsonLd data={breadcrumbSchema([{ name: "Enquire", path: "/enquire" }])} />
      <div className="wrap grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
        <div>
          <Eyebrow left>Enquire</Eyebrow>
          <h1 className="mt-4 !text-[clamp(2.2rem,5vw,3.5rem)]">Ask about a place</h1>
          <Suspense fallback={<EnquiryPriceText />}><EnquiryPrice /></Suspense>
          <EnquiryForm />
        </div>
        <aside aria-labelledby="next-title" className="h-fit rounded-card bg-paper-deep p-6 md:p-8">
          <h2 id="next-title" className="!text-2xl">What happens next</h2>
          <ol className="mt-6 grid gap-6">
            {steps.map((s) => (
              <li key={s.n} className="grid grid-cols-[2.25rem_1fr] gap-4">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-ink font-semibold text-paper">{s.n}</span>
                <div>
                  <p className="font-semibold">{s.t}</p>
                  <p className="mt-1 text-ink-soft">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          {site.contactEmail && (
            <p className="mt-8 text-ink-soft">
              Prefer email? Write to <a className="link-u" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
