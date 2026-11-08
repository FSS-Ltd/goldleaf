import type { Metadata } from "next";
import { CtaBand } from "@/components/CtaBand";
import { Eyebrow } from "@/components/Eyebrow";
import { JsonLd } from "@/components/JsonLd";
import { SoundChips, SoundTiles } from "@/components/SoundTiles";
import { SessionTable, SessionTimeline } from "@/components/SessionTimeline";
import { StagePath } from "@/components/StagePath";
import { ageMap, stages } from "@/content/progression";
import { breadcrumbSchema } from "@/lib/schema-org";

export const metadata: Metadata = {
  title: "How we teach preschool phonics",
  description:
    "Phonics for 2 to 4 year olds, stage by stage: the sounds, tricky words and reading goals we follow, and how a play-based session runs.",
  alternates: { canonical: "/how-we-teach" },
};

export default function HowWeTeach() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "How we teach", path: "/how-we-teach" }])} />

      <section className="section">
        <div className="wrap grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
          <Eyebrow left>How we teach</Eyebrow>
          <h1 className="mt-4">Phonics for 2 to 4 year olds, one clear stage at a time</h1>
          <p className="prose-x mt-6 text-ink-soft">
            Young children learn through play, so every session is short, varied and hands-on. Sounds come first, then
            blending, then reading. We use the common UK order, so what your child learns matches the phases Reception
            teaches. Every reader and activity uses only the sounds and tricky words from its own stage and earlier ones.
          </p>
          </div>
          <SoundTiles />
        </div>
      </section>

      <section className="section section-deep" aria-labelledby="path-title">
        <div className="wrap">
          <h2 id="path-title">The reading path</h2>
          <div className="mt-10 max-w-3xl"><StagePath /></div>
        </div>
      </section>

      <section className="section" aria-labelledby="stages-title">
        <div className="wrap">
          <h2 id="stages-title">Every sound and tricky word</h2>
          <div className="mt-8 grid gap-4 md:hidden">
            {stages.map((s) => (
              <article key={s.id} className="rounded-card border border-line bg-paper p-5">
                <h3>{s.name}</h3>
                <dl className="mt-3 grid gap-3">
                  <div><dt className="text-sm font-semibold text-gold-ink">New sounds</dt><dd>{[1, 2, 4].includes(s.id) ? <SoundChips text={s.sounds} /> : s.sounds}</dd></div>
                  <div><dt className="text-sm font-semibold text-gold-ink">Tricky words</dt><dd>{s.tricky}</dd></div>
                  <div><dt className="text-sm font-semibold text-gold-ink">Reading goal</dt><dd>{s.goal} <span className="text-ink-soft">({s.examples})</span></dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="mt-8 hidden overflow-x-auto rounded-card border border-line bg-paper md:block">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <caption className="sr-only">Phonics stages with new sounds, tricky words and reading goals.</caption>
              <thead>
                <tr className="border-b border-line bg-paper-deep text-sm">
                  <th scope="col" className="p-3 font-semibold">Stage</th>
                  <th scope="col" className="p-3 font-semibold">New sounds, in teaching order</th>
                  <th scope="col" className="p-3 font-semibold">Tricky words</th>
                  <th scope="col" className="p-3 font-semibold">Reading goal</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.id} className="border-b border-line align-top last:border-0">
                    <th scope="row" className="p-3 font-semibold whitespace-nowrap">{s.name}</th>
                    <td className="p-3">{[1, 2, 4].includes(s.id) ? <SoundChips text={s.sounds} /> : s.sounds}</td>
                    <td className="p-3">{s.tricky}</td>
                    <td className="p-3">{s.goal} <span className="text-ink-soft">({s.examples})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section section-deep" aria-labelledby="age-title">
        <div className="wrap">
          <h2 id="age-title">Where your child starts</h2>
          <p className="prose-x mt-4 text-ink-soft">
            New children begin with a short, play-based check, so we place them on the path by what they can do, not by
            their birthday.
          </p>
          <dl className="mt-8 grid gap-4 md:grid-cols-2">
            {ageMap.map((a) => (
              <div key={a.age} className="rounded-card border border-line bg-paper p-5">
                <dt className="font-display text-xl">{a.age}</dt>
                <dd className="mt-2 text-ink-soft">{a.focus}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section" aria-labelledby="session-title">
        <div className="wrap">
          <h2 id="session-title">A session, block by block</h2>
          <p className="prose-x mt-4 text-ink-soft">
            Sessions last up to 1 hour 45 minutes, including arrival and handover. Two year olds do shorter, simpler
            versions of each block. The tutor watches and notes progress during the making block, then gives you a
            one-minute update at the end.
          </p>
          <div className="mt-8 hidden md:block"><SessionTable /></div>
          <div className="mt-8 md:hidden"><SessionTimeline /></div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
