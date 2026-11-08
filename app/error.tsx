"use client";

import Link from "next/link";
import { useEffect } from "react";
import { site } from "@/content/site";
import { Eyebrow } from "@/components/Eyebrow";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the digest only. Never log anything a parent typed.
    if (error.digest) console.error("Page error", error.digest);
  }, [error]);

  return (
    <section className="section">
      <div className="wrap max-w-3xl">
        <Eyebrow left>Something went wrong</Eyebrow>
        <h1 className="mt-4">That page did not grow as planned</h1>
        <p className="prose-x mt-6 text-ink-soft">
          Something broke on our side. You have not lost anything you read. Try again, or go back to the home page.
          {site.contactEmail ? <> If it keeps happening, email <a className="link-u" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</> : null}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-ghost">Back to the home page</Link>
        </div>
      </div>
    </section>
  );
}
