"use client";
export function MessageError({ reset }: { reset: () => void }) {
  return (
    <main className="section wrap">
      <h1>Messages unavailable</h1>
      <p className="mt-3">We could not load messages. Please try again.</p>
      <button type="button" onClick={reset} className="mt-4 min-h-12 underline">
        Try again
      </button>
    </main>
  );
}
