import { Check } from "lucide-react";
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
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((t) => (
        <li key={t} className="flex gap-3 rounded-card border border-line bg-paper p-5">
          <Check aria-hidden="true" className="mt-1 size-5 flex-none text-clay" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
