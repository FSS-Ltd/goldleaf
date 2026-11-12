"use client";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main" className="section wrap"><h1>We could not open the portal</h1><p className="mt-4">Please try again. If this continues, contact Deborah.</p><button type="button" onClick={reset} className="mt-6 rounded-lg bg-ink px-5 py-3 text-paper">Try again</button></main>;
}
