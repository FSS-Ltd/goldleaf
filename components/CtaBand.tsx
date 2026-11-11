import { ButtonLink } from "./Button";
import { site } from "@/content/site";
import type { FoundingAvailability } from "@/lib/founding-availability";

export function CtaBand({ title = "Ready to ask about a place?", availability }: { title?: string; availability: FoundingAvailability }) {
  const foundingOpen = availability !== null && availability.remaining > 0;
  return (
    <section className="on-ink bg-ink text-paper" aria-label="Enquire">
      <div className="wrap section text-center">
        <h2 className="mx-auto max-w-2xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-paper/90">
          Send a short enquiry. {site.tutor.firstName} will reply within 2 working days.
        </p>
        <div className="mt-8">
          <ButtonLink href="/enquire" variant="light">
            {foundingOpen ? "Ask about a founding place" : "Make an enquiry"}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
