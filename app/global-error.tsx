"use client";

// Replaces the whole document when the root layout itself fails, so it carries its own styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, background: "#fef8f3", color: "#06451d", fontFamily: "Georgia, serif", minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
        <main style={{ maxWidth: "36rem" }}>
          <p style={{ letterSpacing: "0.28em", textTransform: "uppercase", fontSize: "0.8rem", color: "#7a5a0c", fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
            Goldleaf Learning
          </p>
          <h1 style={{ fontSize: "2.5rem", lineHeight: 1.1, fontWeight: 500 }}>We hit a problem loading this page</h1>
          <p style={{ fontFamily: "system-ui, sans-serif", lineHeight: 1.6, color: "#35594a" }}>
            Please try again. If it keeps happening, come back in a few minutes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: "1rem", minHeight: "3rem", padding: "0.75rem 1.5rem", borderRadius: 999, border: "2px solid #06451d", background: "#06451d", color: "#fef8f3", fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
