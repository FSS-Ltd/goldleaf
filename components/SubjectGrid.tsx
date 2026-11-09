import { subjects } from "@/content/subjects";

/** Subject cards. `detail` adds what each age works towards (used on /how-we-teach). */
export function SubjectGrid({ detail = false }: { detail?: boolean }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => (
        <li key={s.id} className="rounded-card border border-line bg-paper p-5">
          <h3>{s.name}</h3>
          <p className="mt-2 text-ink-soft">{s.summary}</p>
          {detail && (
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="rounded-card bg-paper-deep p-3">
                <dt className="font-semibold">Age 2 works towards</dt>
                <dd>{s.age2}</dd>
              </div>
              {s.older && (
                <div className="rounded-card bg-paper-deep p-3">
                  <dt className="font-semibold">Ages 3 to 4</dt>
                  <dd>{s.older}</dd>
                </div>
              )}
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}
