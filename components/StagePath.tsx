import { stages } from "@/content/progression";

const ageTag: Record<number, string> = {
  0: "Age 2",
  1: "Age 3",
  2: "Age 4",
  3: "Age 4",
  4: "Confident 4 to 5",
};

/** Seed at Stage 0, then one more leaf at each stage, with a gold bloom at Stage 4. */
function StageGlyph({ id }: { id: number }) {
  const top = 38 - id * 5;
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" className="stage-glyph block rounded-full bg-paper ring-2 ring-gold">
      {id === 0 ? (
        <ellipse cx="24" cy="26" rx="6" ry="8" fill="var(--color-clay)" />
      ) : (
        <>
          <path d={`M24 41 V${top}`} stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
          {Array.from({ length: id }).map((_, i) => {
            const y = 37 - i * 5;
            const dir = i % 2 === 0 ? -1 : 1;
            return (
              <ellipse
                key={i}
                cx={24 + dir * 8}
                cy={y}
                rx="9"
                ry="4"
                transform={`rotate(${dir * 35} ${24 + dir * 8} ${y})`}
                fill="var(--color-ink)"
              />
            );
          })}
          {id === 4 && <circle cx="24" cy={top - 2} r="5" fill="var(--color-gold)" />}
        </>
      )}
    </svg>
  );
}

export function StagePath() {
  return (
    <div className="relative">
      <svg
        className="vine pointer-events-none absolute left-0 top-0 h-full w-12"
        viewBox="0 0 48 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M24 0 C 44 120, 4 240, 24 360 S 44 600, 24 720 S 4 880, 24 1000"
          pathLength="1"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <ol className="relative grid gap-10">
        {stages.map((s) => (
          <li key={s.id} className="grid grid-cols-[3rem_1fr] gap-5 md:gap-8">
            <div className="relative z-10"><StageGlyph id={s.id} /></div>
            <div className="pt-1">
              <p className="mb-1 text-sm font-semibold text-gold-ink">{ageTag[s.id]}</p>
              <h3>{s.name}</h3>
              <p className="prose-x mt-2">{s.goal}</p>
              <p className="mt-2 text-ink-soft">Words like: <span className="font-semibold text-ink">{s.examples}</span></p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
