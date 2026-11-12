const letters = ["s", "a", "t", "p", "i", "n", "m", "d", "g"];

/** Decorative first sounds in teaching order. Hidden from assistive tech: the text on the page says the same. */
export function SoundTiles() {
  return (
    <div aria-hidden="true" className="grid w-full max-w-xs grid-cols-3 gap-3 md:ml-auto md:max-w-sm md:gap-4">
      {letters.map((l, i) => (
        <div
          key={l}
          style={{ "--i": i } as React.CSSProperties}
          className={`tile tile-pop text-5xl md:text-6xl ${i === 0 || i === 4 ? "accent" : i === 7 ? "gold" : ""}`}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

/** Splits a sounds string into chips. Spaces inside brackets stay together, for example "oo (book)". */
export function SoundChips({ text }: { text: string }) {
  const tokens = text.match(/[^\s·]+(?:\s+\([^)]*\))?/g) ?? [];
  return (
    <span>
      {tokens.map((t) => (
        <span key={t} className="chip">{t}</span>
      ))}
    </span>
  );
}

/** Display explicitly recorded labels without splitting digraphs or parenthetical text. */
export function RecordedSoundChips({ sounds }: { sounds: string[] }) {
  return <span>{sounds.map((sound) => <span key={sound} className="chip">{sound}</span>)}</span>;
}
