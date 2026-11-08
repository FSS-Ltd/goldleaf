import { site } from "@/content/site";

export function SafeHands() {
  const items = [
    "At home, a parent or carer stays in the house for the whole session.",
    "At church, children are signed in and out, and only go home with named adults. The door stays open or the room stays visible.",
    "You can stay for the session or drop off. Your child's routine, naps and mealtimes come first.",
    "A short chat at handover keeps you in the loop on what your child tried and enjoyed.",
  ];
  if (site.trust.dbsEnhanced) items.push("Enhanced DBS checked.");
  if (site.trust.insured) items.push("Public liability and professional indemnity insurance in place.");
  if (site.trust.safeguardingPolicy) items.push("A written safeguarding policy, available on request.");
  return (
    <ol className="grid gap-x-14 md:grid-cols-2">
      {items.map((t, i) => (
        <li key={t} className="grid grid-cols-[3.5rem_1fr] items-baseline gap-4 border-t-2 border-gold/60 py-6">
          <span aria-hidden="true" className="font-display text-4xl font-semibold text-clay md:text-5xl">{String(i + 1).padStart(2, "0")}</span>
          <span className="text-[1.05em]">{t}</span>
        </li>
      ))}
    </ol>
  );
}
