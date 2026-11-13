import { ChevronDown } from "lucide-react";
import { sessionBlocks } from "@/content/session";

/** Condensed list for the landing page. Each block opens to show how it differs by age. */
export function SessionTimeline() {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {sessionBlocks.map((b) => (
        <li key={b.name}>
          <details className="group">
            <summary className="grid min-h-14 grid-cols-[6.5rem_1fr_auto] items-center gap-3 py-3 md:grid-cols-[9rem_1fr_auto]">
              <span className="text-sm font-medium text-ink-soft md:text-base">{b.time}</span>
              <span className="font-semibold">{b.name}</span>
              <ChevronDown aria-hidden="true" className="size-5 text-clay transition-transform duration-150 group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 pb-5 md:grid-cols-[9rem_1fr] md:gap-x-3">
              <span aria-hidden="true" className="hidden md:block" />
              <div>
                <p className="text-ink-soft">{b.what}</p>
                {b.age2 === b.age34 ? (
                  <p className="mt-3 rounded-card bg-paper-deep p-3 text-sm font-semibold">The same for every age</p>
                ) : (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-card bg-paper-deep p-3"><dt className="text-sm font-semibold">Age 2</dt><dd>{b.age2}</dd></div>
                    <div className="rounded-card bg-paper-deep p-3"><dt className="text-sm font-semibold">Ages 3 to 4</dt><dd>{b.age34}</dd></div>
                  </dl>
                )}
              </div>
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}

/** Full table for /how-we-teach. */
export function SessionTable() {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-paper">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <caption className="sr-only">The session, block by block, for age 2 and ages 3 to 4.</caption>
        <thead>
          <tr className="border-b border-line bg-paper-deep text-sm">
            <th scope="col" className="p-3 font-semibold">Time</th>
            <th scope="col" className="p-3 font-semibold">Block</th>
            <th scope="col" className="p-3 font-semibold">Age 2</th>
            <th scope="col" className="p-3 font-semibold">Ages 3 to 4</th>
          </tr>
        </thead>
        <tbody>
          {sessionBlocks.map((b) => (
            <tr key={b.name} className="border-b border-line align-top last:border-0">
              <td className="p-3 whitespace-nowrap text-ink-soft">{b.time}</td>
              <th scope="row" className="p-3 font-semibold">{b.name}<span className="block font-normal text-ink-soft">{b.what}</span></th>
              {b.age2 === b.age34 ? (
                <td colSpan={2} className="p-3 text-ink-soft">The same for every age</td>
              ) : (
                <>
                  <td className="p-3">{b.age2}</td>
                  <td className="p-3">{b.age34}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
