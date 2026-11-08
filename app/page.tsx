import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock, House, Sprout, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { CtaBand } from "@/components/CtaBand";
import { ComingSoon } from "@/components/ComingSoon";
import { Eyebrow } from "@/components/Eyebrow";
import { Faq } from "@/components/Faq";
import { FoundingBand } from "@/components/FoundingBand";
import { JsonLd } from "@/components/JsonLd";
import { PricingTable } from "@/components/PricingTable";
import { SafeHands } from "@/components/SafeHands";
import { SessionTimeline } from "@/components/SessionTimeline";
import { StagePath } from "@/components/StagePath";
import { site, foundingOpen } from "@/content/site";
import { faqSchema, organisationSchema } from "@/lib/schema-org";

export const metadata: Metadata = {
  title: { absolute: "Phonics & Early Years Tutor in Ashford, Kent | Goldleaf" },
  description:
    "One-to-one, play-based phonics, maths and music tutoring for 2 to 4 year olds in Ashford, Kent. In your home or at a local church. Founding places open.",
  alternates: { canonical: "/" },
};

const facts = [
  { icon: Sprout, title: "Ages 2 to 4", text: "For children not yet in school." },
  { icon: UserRound, title: "One to one", text: "Your child gets the tutor's full attention. No groups." },
  { icon: House, title: "Home or church", text: "In your home, or at a local church room." },
  { icon: Clock, title: "Stay or drop off", text: "You choose. Sessions fit around naps." },
];

export default function Home() {
  return (
    <>
      <JsonLd data={[...organisationSchema(), faqSchema()]} />

      {/* Hero */}
      <section className="section pb-12 md:pb-20">
        <div className="wrap grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr] md:gap-14">
          <div className="order-2 md:order-1">
            <Eyebrow left>Tutoring in Ashford, Kent</Eyebrow>
            <h1 className="mt-4">A gentle head start in reading for 2 to 4 year olds in Ashford</h1>
            <p className="prose-x mt-6 text-ink-soft">
              One-to-one, play-based sessions in phonics, early maths and music. In your home or at a local church,
              following one clear reading path from first sounds to first books.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/enquire">{foundingOpen ? "Ask about a founding place" : "Make an enquiry"}</ButtonLink>
              <ButtonLink href="/how-we-teach" variant="ghost">See how we teach</ButtonLink>
            </div>
          </div>
          <div className="order-1 w-24 sm:w-40 md:order-2 md:mx-auto md:w-full md:max-w-none">
            <div>
              <Image
                src="/brand/goldleaf-hero-mark.webp"
                alt="The Goldleaf logo: a green letter G holding a pot with a golden seedling growing from it"
                width={660}
                height={528}
                priority
                sizes="(min-width: 768px) 40vw, 22rem"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <FoundingBand />

      {/* Session */}
      <section className="section" aria-labelledby="session-title">
        <div className="wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
          <div>
            <Eyebrow left>A session</Eyebrow>
            <h2 id="session-title" className="mt-3">What a session looks like</h2>
            <p className="prose-x mt-4 text-ink-soft">
              One hour 45 minutes of short, varied, play-based activities. Songs, movement, a story, counting games and
              making, with a few minutes of phonics at the heart of it.
            </p>
            <p className="mt-4 font-semibold">You get a one-minute update at the end of every session.</p>
          </div>
          <SessionTimeline />
        </div>
      </section>

      {/* Reading path */}
      <section className="section section-deep" aria-labelledby="path-title">
        <div className="wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
          <div className="md:sticky md:top-28 md:self-start">
            <Eyebrow left>One reading path</Eyebrow>
            <h2 id="path-title" className="mt-3">From first sounds to first books</h2>
            <p className="prose-x mt-4 text-ink-soft">
              We teach in the common UK order, so your child&rsquo;s sounds match what Reception uses. Each stage builds on the last.
            </p>
            <p className="mt-6">
              <Link href="/how-we-teach" className="link-u font-semibold">
                See every sound and tricky word, stage by stage
              </Link>
            </p>
          </div>
          <StagePath />
        </div>
      </section>

      {/* Who it's for */}
      <section className="section" aria-labelledby="who-title">
        <div className="wrap">
          <Eyebrow left>Who it&rsquo;s for</Eyebrow>
          <h2 id="who-title" className="mt-3">Early learning, built around your child</h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon aria-hidden="true" className="size-8 text-clay" />
                <h3 className="mt-3">{title}</h3>
                <p className="mt-1 text-ink-soft">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="section section-deep" aria-labelledby="pricing-title">
        <div className="wrap">
          <div className="max-w-2xl">
            <Eyebrow left>Pricing</Eyebrow>
            <h2 id="pricing-title" className="mt-3">Clear prices, per child</h2>
            <p className="mt-4 text-ink-soft">
              {foundingOpen
                ? `Standard rate £${site.standardRate} an hour. Founding families pay £${site.founding.rate} an hour until ${site.founding.endsLabel}, then £${site.founding.rateAfter} an hour for as long as they stay.`
                : `The standard rate is £${site.standardRate} an hour.`}
            </p>
          </div>
          <div className="mt-8"><PricingTable /></div>
          <div className="mt-8"><ButtonLink href="/enquire">Ask about a place</ButtonLink></div>
        </div>
      </section>

      {/* Safe hands */}
      <section className="section" aria-labelledby="safe-title">
        <div className="wrap">
          <Eyebrow left>Safe hands</Eyebrow>
          <h2 id="safe-title" className="mt-3">How sessions run safely</h2>
          <div className="mt-8"><SafeHands /></div>
        </div>
      </section>

      {/* Tutor */}
      <section className="section section-deep" aria-labelledby="tutor-title">
        <div className="wrap grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div
            aria-hidden="true"
            className="grid size-32 place-items-center rounded-full bg-paper font-display text-4xl text-ink ring-2 ring-gold md:size-40"
          >
            {site.tutor.initials}
          </div>
          <div>
            <Eyebrow left>Your tutor</Eyebrow>
            <h2 id="tutor-title" className="mt-3">Meet {site.tutor.firstName}</h2>
            <p className="prose-x mt-4 text-ink-soft">{site.tutor.bio}</p>
            <p className="mt-4">
              <Link href="/about" className="link-u font-semibold">More about Goldleaf</Link>
            </p>
          </div>
        </div>
      </section>

      <ComingSoon />

      {/* FAQ */}
      <section id="faq" className="section section-deep" aria-labelledby="faq-title">
        <div className="wrap-3xl">
          <Eyebrow left>Questions</Eyebrow>
          <h2 id="faq-title" className="mt-3">Questions parents ask</h2>
          <div className="mt-8"><Faq /></div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
