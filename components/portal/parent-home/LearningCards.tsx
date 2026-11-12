import Link from "next/link";
import { RecordedSoundChips } from "@/components/SoundTiles";
import type {
  Child,
  PublishedLearningUpdate,
} from "@/lib/portal/learning-schemas";

type LatestLearning =
  | { child: Child; update: PublishedLearningUpdate }
  | undefined;

export function LearningCard({ latest }: { latest: LatestLearning }) {
  return (
    <section className="rounded-[18px] border border-[#e3d7c3] bg-[#f6eee2] p-6 sm:p-8">
      <h2 className="!text-2xl">Latest shared focus</h2>
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
    <section className="rounded-[18px] border border-[#e3d7c3] bg-[#f6eee2] p-6 sm:p-8">
      <h2 className="!text-2xl">Latest learning note</h2>
      {latest ? (
        <>
          <blockquote className="mt-5 border-l-2 border-[#c6a66a] pl-4 italic leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
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
