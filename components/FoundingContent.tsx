import { ButtonLink } from "@/components/Button";
import { CtaBand } from "@/components/CtaBand";
import { FoundingBand } from "@/components/FoundingBand";
import { PricingTable } from "@/components/PricingTable";
import { site } from "@/content/site";
import { getFoundingAvailability } from "@/lib/founding-availability";

export async function FoundingButton() {
  const availability = await getFoundingAvailability();
  return <ButtonLink href="/enquire">{availability && availability.remaining > 0 ? "Ask about a founding place" : "Make an enquiry"}</ButtonLink>;
}

export async function LiveFoundingBand() {
  return <FoundingBand availability={await getFoundingAvailability()} />;
}

export async function LiveCtaBand() {
  return <CtaBand availability={await getFoundingAvailability()} />;
}

export async function LivePricing() {
  const availability = await getFoundingAvailability();
  return <Pricing availability={availability} />;
}

export function Pricing({ availability }: { availability: Awaited<ReturnType<typeof getFoundingAvailability>> }) {
  const foundingOpen = availability !== null && availability.remaining > 0;
  return (
    <>
      <p className="mt-4 max-w-2xl text-ink-soft">
        {foundingOpen
          ? `Standard rate £${site.standardSessionFee} a session. Founding families pay £${site.founding.sessionFee} a session until ${site.founding.endsLabel}, then £${site.founding.sessionFeeAfter} a session for as long as they stay.`
          : `The standard rate is £${site.standardSessionFee} a session.`}
      </p>
      <div className="mt-8"><PricingTable availability={availability} /></div>
    </>
  );
}

export async function EnquiryPrice() {
  const availability = await getFoundingAvailability();
  return <EnquiryPriceText open={availability !== null && availability.remaining > 0} />;
}

export function EnquiryPriceText({ open = false }: { open?: boolean }) {
  return <p className="prose-x mt-4 mb-10 text-ink-soft">
    {open
      ? `Founding places are £${site.founding.sessionFee} a session until ${site.founding.endsLabel}. The standard rate is £${site.standardSessionFee} a session.`
      : `The standard rate is £${site.standardSessionFee} a session.`}{" "}
    This is not a booking. It starts a conversation.
  </p>;
}
