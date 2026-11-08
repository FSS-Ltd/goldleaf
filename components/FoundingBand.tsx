import { site, foundingOpen, foundingPlacesLeft } from "@/content/site";
import { Eyebrow } from "./Eyebrow";
import { ButtonLink } from "./Button";

export function FoundingBand() {
  const f = site.founding;
  return (
    <section aria-labelledby="founding-title" className="on-ink bg-ink text-paper">
      <div className="wrap grid items-center gap-6 py-10 md:grid-cols-[1fr_auto] md:py-12">
        <div>
          <Eyebrow left dark>Founding families</Eyebrow>
          {foundingOpen ? (
            <>
              <h2 id="founding-title" className="mt-3 !text-[clamp(1.6rem,3.4vw,2.4rem)]">
                {foundingPlacesLeft} of {f.total} founding places left
              </h2>
              <p className="mt-3 max-w-2xl text-paper/90">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-clay align-middle" aria-hidden="true" />
                £{f.rate} an hour until {f.endsLabel}, then £{f.rateAfter} an hour for as long as you stay.
                The standard rate is £{site.standardRate} an hour.
              </p>
            </>
          ) : (
            <>
              <h2 id="founding-title" className="mt-3 !text-[clamp(1.6rem,3.4vw,2.4rem)]">
                Founding places are full
              </h2>
              <p className="mt-3 max-w-2xl text-paper/90">New families pay the standard rate of £{site.standardRate} an hour.</p>
            </>
          )}
        </div>
        <ButtonLink href="/enquire" variant="light">
          {foundingOpen ? "Ask about a founding place" : "Make an enquiry"}
        </ButtonLink>
      </div>
    </section>
  );
}
