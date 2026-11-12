import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, House, Sprout, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { CtaBand } from "@/components/CtaBand";
import { FoundingButton, LiveCtaBand, LiveFoundingBand, LivePricing, Pricing } from "@/components/FoundingContent";
import { ComingSoon } from "@/components/ComingSoon";
import { Eyebrow } from "@/components/Eyebrow";
import { Faq } from "@/components/Faq";
import { FoundingBand } from "@/components/FoundingBand";
import { JsonLd } from "@/components/JsonLd";
import { SafeHands } from "@/components/SafeHands";
import { SessionTimeline } from "@/components/SessionTimeline";
import { SubjectGrid } from "@/components/SubjectGrid";
import { SeedlingScene } from "@/components/seedling/SeedlingScene";
import { SoundMoment } from "@/components/SoundMoment";
import { StagePath } from "@/components/StagePath";
import { site } from "@/content/site";
import { faqSchema, organisationSchema } from "@/lib/schema-org";

export const metadata: Metadata = {
  title: { absolute: "Phonics & Early Years Tutor in Ashford, Kent | Goldleaf" },
  description:
    "One-to-one, play-based early learning for 2 to 4 year olds in Ashford, Kent: phonics, stories, maths, science, art and music. In your home or at a local church.",
  alternates: { canonical: "/" },
  openGraph: { title: "Phonics & Early Years Tutor in Ashford, Kent | Goldleaf", url: "/", images: ["/opengraph-image.png"] },
};

const heroLetters = ["s", "a", "t", "p", "i", "n", "m", "d"];

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
          <div className="order-1">
            <Eyebrow left>Tutoring in Ashford, Kent</Eyebrow>
            <h1 className="mt-4">A gentle head start in learning for 2 to 4 year olds in Ashford</h1>
            <p className="prose-x mt-6 text-ink-soft">
              One-to-one, play-based sessions across reading, maths, science, art and music. In your home or at a local
              church, with one clear reading path from first sounds to first books.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Suspense fallback={<ButtonLink href="/enquire">Make an enquiry</ButtonLink>}><FoundingButton /></Suspense>
              <ButtonLink href="/how-we-teach" variant="ghost">See how we teach</ButtonLink>
            </div>
          </div>
          <div className="order-2 mx-auto w-full max-w-sm md:order-2 md:max-w-none">
            <SeedlingScene
              letters={heroLetters}
              label="A golden seedling growing in a terracotta pot, surrounded by floating letter tiles for the first sounds s, a, t, p, i, n, m and d"
              scrollGrowth
              className="aspect-square w-full"
              poster={
                <Image
                  src="/brand/goldleaf-hero-mark.webp"
                  alt=""
                  width={660}
                  height={528}
                  sizes="(min-width: 768px) 40vw, 24rem"
                  className="absolute inset-[8%] h-[84%] w-[84%] object-contain"
                />
              }
            />
          </div>
        </div>
      </section>

      <Suspense fallback={<FoundingBand availability={null} />}><LiveFoundingBand /></Suspense>

      {/* Subjects */}
      <section className="section" aria-labelledby="subjects-title">
        <div className="wrap">
          <Eyebrow left>What we teach</Eyebrow>
          <h2 id="subjects-title" className="mt-3">Every part of early learning, not just reading</h2>
          <p className="prose-x mt-4 text-ink-soft">
            Sessions mix nine short subjects across the week, so your child builds language, number sense, curiosity,
            coordination and confidence together.
          </p>
          <div className="mt-8"><SubjectGrid /></div>
          <p className="mt-6">
            <Link href="/how-we-teach#subjects-title" className="link-u font-semibold">
              See what each subject covers at each age
            </Link>
          </p>
        </div>
      </section>

      {/* Session */}
      <section className="section" aria-labelledby="session-title">
        <div className="wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
          <div>
            <Eyebrow left>A session</Eyebrow>
            <h2 id="session-title" className="mt-3">What a session looks like</h2>
            <p className="prose-x mt-4 text-ink-soft">
              Two hours of short, varied, play-based activities. Songs, movement, a story, counting games,
              discovery and making, with phonics woven through it.
            </p>
            <p className="mt-4 font-semibold">You get a short handover note at the end of every session.</p>
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

      <SoundMoment />

      {/* Pricing */}
      <section id="pricing" className="section section-deep" aria-labelledby="pricing-title">
        <div className="wrap">
          <div className="max-w-2xl">
            <Eyebrow left>Pricing</Eyebrow>
            <h2 id="pricing-title" className="mt-3">Clear prices, per child</h2>
          </div>
          <Suspense fallback={<Pricing availability={null} />}><LivePricing /></Suspense>
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

      <Suspense fallback={<CtaBand availability={null} />}><LiveCtaBand /></Suspense>
    </>
  );
}
