import { z } from "zod";
import { site } from "@/content/site";
import { DISCOUNT, monthly, weekly } from "@/lib/pricing";

const common = {
  days: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  cadence: z.enum(["weekly", "monthly"]),
  serviceDate: z.iso.date(),
};

const quoteInput = z.discriminatedUnion("tier", [
  z.strictObject({ ...common, tier: z.literal("standard") }),
  z.strictObject({ ...common, tier: z.literal("founding"), foundingTransitionDate: z.iso.date() }),
]);

export type InvoiceQuote = {
  tier: "standard" | "founding" | "founding-post-intro";
  days: 1 | 2 | 3 | 4 | 5;
  cadence: "weekly" | "monthly";
  serviceDate: string;
  foundingTransitionDate?: string;
  hourlyRatePence: number;
  discountPercent: number;
  sessionMinutes: number;
  amountPence: number;
  currency: "GBP";
};

export function quoteInvoice(input: unknown): InvoiceQuote {
  const parsed = quoteInput.parse(input);
  const postIntro = parsed.tier === "founding" && parsed.serviceDate >= parsed.foundingTransitionDate;
  const rate = parsed.tier === "standard" ? site.standardRate : postIntro ? site.founding.rateAfter : site.founding.rate;
  const isStandard = parsed.tier === "standard";
  const weeklyPrice = weekly(rate, parsed.days, isStandard);

  return {
    ...parsed,
    tier: postIntro ? "founding-post-intro" : parsed.tier,
    hourlyRatePence: rate * 100,
    discountPercent: isStandard ? DISCOUNT[parsed.days] * 100 : 0,
    sessionMinutes: site.sessionMinutes,
    amountPence: (parsed.cadence === "weekly" ? weeklyPrice : monthly(weeklyPrice)) * 100,
    currency: "GBP",
  };
}
