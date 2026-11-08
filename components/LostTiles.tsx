/** Static stand-in for the 404 scene: three tiles and a seedling, drawn in CSS and SVG. */
export function LostTiles() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative w-[78%]">
        <div className="flex items-end justify-center gap-3 md:gap-4">
          {["4", "0", "4"].map((l, i) => (
            <div key={i} className={`tile w-1/4 text-6xl md:text-7xl ${i === 1 ? "accent" : ""}`} style={{ transform: `rotate(${(i - 1) * 7}deg) translateY(${i === 1 ? "-14%" : "0"})` }}>
              {l}
            </div>
          ))}
        </div>
        <svg viewBox="0 0 120 70" aria-hidden="true" className="mx-auto mt-6 w-1/3">
          <path d="M60 68 V40" stroke="#c9971c" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M60 44 q-24 -2 -26 -24 q22 2 26 24z" fill="#daa835" />
          <path d="M60 40 q22 0 28 -20 q-24 0 -28 20z" fill="#c9971c" />
          <ellipse cx="60" cy="68" rx="30" ry="3" fill="#06451d" opacity=".18" />
        </svg>
      </div>
    </div>
  );
}
