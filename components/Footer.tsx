import Link from "next/link";
import { site, areaLabel } from "@/content/site";

export function Footer() {
  return (
    <footer className="section-deep border-t border-line">
      <div className="wrap grid gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">{site.name}</p>
          <p className="mt-2 text-ink-soft">Play-based tutoring for 2 to 4 year olds.</p>
        </div>
        <div>
          <p className="font-semibold">Where we teach</p>
          <p className="mt-2 text-ink-soft">{areaLabel}. In your home or at a local church.</p>
        </div>
        <div>
          <p className="font-semibold">Get in touch</p>
          {site.contactEmail && (
            <p>
              <a className="link-u" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            </p>
          )}
          <p>
            <Link href="/enquire" className="link-u">Send an enquiry</Link>
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="wrap flex flex-wrap justify-between gap-3 py-5 text-sm text-ink-soft">
          <p>&copy; {site.name}</p>
          <Link href="/privacy" className="link-u">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
