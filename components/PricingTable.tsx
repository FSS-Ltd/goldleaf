import { site } from "@/content/site";
import type { FoundingAvailability } from "@/lib/founding-availability";
import { DAYS, DISCOUNT, monthly, weekly } from "@/lib/pricing";

const gbp = (n: number) => `£${n}`;

function Price({ rate, days, strong = false, discounted = true }: { rate: number; days: (typeof DAYS)[number]; strong?: boolean; discounted?: boolean }) {
  const w = weekly(rate, days, discounted);
  return (
    <>
      <span className={`block whitespace-nowrap text-lg ${strong ? "font-semibold" : ""}`}>
        {gbp(w)} <span className="text-sm font-normal text-ink-soft">a week</span>
      </span>
      <span className="block text-sm text-ink-soft">{gbp(monthly(w))} a month</span>
    </>
  );
}

export function PricingTable({ availability }: { availability: FoundingAvailability }) {
  const foundingOpen = availability !== null && availability.remaining > 0;
  const f = site.founding;
  const std = site.standardSessionFee;
  return (
    <div>
      <div className="overflow-x-auto rounded-card border border-line bg-paper">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Prices per child, per week and per month, at the standard rate{foundingOpen ? " and the founding rate" : ""}.
          </caption>
          <thead>
            <tr className="border-b border-line bg-paper-deep text-sm">
              <th scope="col" className="p-3 font-semibold md:p-4">Days a week</th>
              <th scope="col" className="p-3 font-semibold md:p-4">Standard<br /><span className="font-normal text-ink-soft">£{std} a session</span></th>
              {foundingOpen && (
                <th scope="col" className="p-3 font-semibold md:p-4">Founding<br /><span className="font-normal text-ink-soft">£{f.sessionFee} a session</span></th>
              )}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d) => {
              const off = Math.round(DISCOUNT[d] * 100);
              return (
                <tr key={d} className="border-b border-line align-top last:border-0">
                  <th scope="row" className="p-3 font-semibold md:p-4">
                    {d} {d === 1 ? "day" : "days"}
                    {off > 0 && <span className="mt-1 block w-fit rounded-full bg-paper-deep px-2 py-0.5 text-xs font-medium text-gold-ink">{off}% off</span>}
                  </th>
                  <td className="px-2.5 py-3 md:p-4"><Price rate={std} days={d} /></td>
                  {foundingOpen && <td className="px-2.5 py-3 md:p-4"><Price rate={f.sessionFee} days={d} strong discounted={false} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[65ch] text-sm text-ink-soft">
        Each session fee covers {Math.floor(site.sessionMinutes / 60)} hour {site.sessionMinutes % 60} minutes with your child, plus setup, resources and your handover note. Standard rate only: 5% off at 4 days and 10% off at 5, rounded to the nearest £5.{foundingOpen && " The founding rate is already discounted, so no further discounts apply."}
        {" "}Monthly prices are averaged across the year (weekly price &times; 52 weeks &divide; 12 months), so you pay the same each month.
        {foundingOpen && ` Founding prices run until ${f.endsLabel}, then founding families pay £${f.sessionFeeAfter} a session.`}
      </p>
    </div>
  );
}
