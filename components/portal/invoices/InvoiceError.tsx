"use client";
export function InvoiceError({ reset }: { reset: () => void }) {
  return (
    <main className="section wrap">
      <h1>Invoices unavailable</h1>
      <p className="mt-4">We could not load this page. Please try again.</p>
      <button type="button" className="mt-4 underline" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
