import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ChildSelector } from "@/components/portal/learning/ChildSelector";
import { StageGlyph } from "@/components/StagePath";
import { RecordedSoundChips } from "@/components/SoundTiles";
import { parentChildren } from "@/lib/portal/parent-children";
import { listPublishedLearning, stages } from "@/lib/portal/learning";

export const metadata = {
  title: "Learning",
  robots: { index: false, follow: false },
};
async function ParentLearning({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const [{ identity, memberships, families }, params] = await Promise.all([
    parentChildren(),
    searchParams,
  ]);
  const children = families.flatMap((item) =>
    item.children.map((child) => ({
      ...child,
      familyName:
        families.length > 1
          ? (item.family?.display_name ?? "Family")
          : undefined,
    })),
  );
  if (params.child && !children.some((item) => item.id === params.child))
    notFound();
  const child = params.child
    ? children.find((item) => item.id === params.child)
    : children.length === 1
      ? children[0]
      : undefined;
  const updates = child
    ? await listPublishedLearning(child.family_id, child.id)
    : [];
  const latest = updates[0];
  return (
    <PortalShell
      role="parent"
      userId={identity.userId}
      memberships={memberships}
      section="learning"
    >
      <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">
        Learning &amp; observations
      </h1>
      <ChildSelector options={children} selected={child?.id} />
      {child &&
        (latest ? (
          <div className="mt-7 grid gap-6 lg:grid-cols-3">
            <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2">
              <h2 className="!text-xl">Latest shared focus</h2>
              <p className="mt-2 text-sm">
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "long",
                  timeZone: "Europe/London",
                }).format(new Date(latest.published_at))}
              </p>
              {latest.stage !== null && (
                <p className="mt-3">
                  {stages.find((stage) => stage.id === latest.stage)?.name}
                </p>
              )}
              {latest.stage !== null && (
                <ol
                  aria-label="Curriculum stages"
                  className="mt-5 border-l-2 border-[#c5a54f] pl-5 space-y-4"
                >
                  {stages.map((stage) => (
                    <li key={stage.id} className="flex items-center gap-3">
                      <StageGlyph id={stage.id} />
                      <span>
                        {stage.name}
                        {stage.id === latest.stage && (
                          <span className="block text-sm text-[#35594a]">
                            Latest shared stage
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {latest.focus && <p className="mt-3">{latest.focus}</p>}
              {latest.explored_sounds.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-medium">Sounds explored</h3>
                  <div className="mt-3">
                    <RecordedSoundChips sounds={latest.explored_sounds} />
                  </div>
                </div>
              )}
              {latest.practice && <p className="mt-5">{latest.practice}</p>}
            </section>
            <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
              <h2 className="!text-xl">Shared tutor observations</h2>
              <ul className="mt-4 space-y-5">
                {updates.map((update) => (
                  <li key={update.id}>
                    <p className="text-sm text-[#35594a]">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeZone: "Europe/London",
                      }).format(new Date(update.published_at))}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">{update.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <p className="mt-7">
            No learning updates have been shared for {child.display_name} yet.
          </p>
        ))}
    </PortalShell>
  );
}
export default function LearningPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  return (
    <Suspense
      fallback={<main className="section wrap">Opening learning…</main>}
    >
      <ParentLearning searchParams={searchParams} />
    </Suspense>
  );
}
