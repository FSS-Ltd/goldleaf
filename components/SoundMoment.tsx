const rows = [
  { text: "s a t p i n m d", cls: "text-gold-light", dir: "l" },
  { text: "ch sh th ng ai ee igh oa", cls: "text-paper/45", dir: "r" },
  { text: "ar or ur ow oi ear air", cls: "text-paper", dir: "l" },
];

/** Full-bleed typographic moment: the sounds themselves, drifting with scroll. */
export function SoundMoment() {
  return (
    <section aria-labelledby="sounds-title" className="on-ink overflow-hidden bg-ink py-16 text-paper md:py-24">
      <div className="wrap">
        <p className="eyebrow left on-dark">Sounds first</p>
        <h2 id="sounds-title" className="mt-3 max-w-xl text-paper">
          Sounds first. Letter names later. Reading follows.
        </h2>
      </div>
      <div aria-hidden="true" className="mt-10 grid gap-2 md:mt-14">
        {rows.map((r) => (
          <p key={r.text} className={`sound-row ${r.dir} whitespace-nowrap font-display text-[clamp(3.5rem,13vw,11rem)] font-semibold leading-[1.02] tracking-tight ${r.cls}`}>
            {r.text}
          </p>
        ))}
      </div>
    </section>
  );
}
