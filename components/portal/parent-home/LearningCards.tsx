import Link from "next/link";
import { StageGlyph } from "@/components/StagePath";
import { stages } from "@/content/progression";
import { RecordedSoundChips } from "@/components/SoundTiles";
import type {
  Child,
  PublishedLearningUpdate,
} from "@/lib/portal/learning-schemas";

type LatestLearning =
  | { child: Child; update: PublishedLearningUpdate }
  | undefined;

export function LearningCard({ latest }: { latest: LatestLearning }) {
  const stage =
    latest?.update.stage == null
      ? undefined
      : stages.find((item) => item.id === latest.update.stage);
  return (
    <section className="py-2 sm:rounded-[18px] sm:border sm:border-[#e3d7c3] sm:bg-[#f6eee2] sm:p-8">
      <h2 className="!text-2xl">Latest shared focus</h2>
      {stage && (
        <div className="mt-4 flex items-center gap-3">
          <StageGlyph id={stage.id} />
          <p className="font-medium">{stage.name}</p>
        </div>
      )}
      {latest && (
        <p className="mt-3 text-sm font-medium">{latest.child.display_name}</p>
      )}
      {latest?.update.focus ? (
        <p className="mt-4 whitespace-pre-wrap [overflow-wrap:anywhere]">
          {latest.update.focus}
        </p>
      ) : (
        <p className="mt-4 text-sm">No focus in the latest update.</p>
      )}
      {latest && latest.update.explored_sounds.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium">Sounds explored</p>
          <div className="mt-2 [&_.chip]:!px-4 [&_.chip]:!py-2 [&_.chip]:!text-2xl">
            <RecordedSoundChips sounds={latest.update.explored_sounds} />
          </div>
        </div>
      )}
      <Link
        prefetch={false}
        className="mt-6 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4"
        href={
          latest
            ? `/parent/learning?child=${encodeURIComponent(latest.child.id)}`
            : "/parent/learning"
        }
      >
        View learning
      </Link>
    </section>
  );
}

export function NoteCard({ latest }: { latest: LatestLearning }) {
  return (
    <section className="rounded-[18px] border border-[#e3d7c3] border-l-4 border-l-[#c69b31] bg-[#f6eee2] p-6 sm:p-8">
      <h2 className="!text-2xl">Latest learning note</h2>
      {latest ? (
        <>
          <blockquote className="mt-5 italic leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
            {latest.update.body}
          </blockquote>
          <p className="mt-5 text-sm">
            {latest.child.display_name} ·{" "}
            {new Intl.DateTimeFormat("en-GB", {
              dateStyle: "medium",
              timeZone: "Europe/London",
            }).format(new Date(latest.update.published_at))}
          </p>
        </>
      ) : (
        <p className="mt-5 text-sm">No learning updates shared yet.</p>
      )}
    </section>
  );
}
