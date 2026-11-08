import { ChevronDown } from "lucide-react";
import { faqs } from "@/content/faq";

export function Faq() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((f) => (
        <details key={f.q} className="group py-1">
          <summary className="flex min-h-14 items-center justify-between gap-4 py-3 font-semibold">
            <span>{f.q}</span>
            <ChevronDown aria-hidden="true" className="size-5 flex-none text-clay transition-transform duration-150 group-open:rotate-180" />
          </summary>
          <p className="prose-x pb-4 text-ink-soft">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
