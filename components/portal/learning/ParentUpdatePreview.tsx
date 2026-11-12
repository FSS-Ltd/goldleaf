import { RecordedSoundChips } from "@/components/SoundTiles";
import type { LearningPreview } from "@/lib/portal/learning-schemas";

export function ParentUpdatePreview({
  preview,
  childName,
  familyName,
  pending,
  sharing,
  onShare,
}: {
  preview: LearningPreview;
  childName: string;
  familyName: string;
  pending: boolean;
  sharing: boolean;
  onShare: () => void;
}) {
  return (
    <div className="mt-6 rounded-lg border border-[#d6c8b5] bg-white p-4">
      <h3 className="font-medium">Preview for {familyName}</h3>
      <p className="mt-2 text-sm">
        {childName} · Authorised parents can view this in the family record.
      </p>
      <p className="mt-4 whitespace-pre-wrap">{preview.body}</p>
      {preview.stage !== null && <p className="mt-3">Stage {preview.stage}</p>}
      {preview.focus && <p className="mt-3">{preview.focus}</p>}
      {preview.practice && <p className="mt-3">{preview.practice}</p>}
      {preview.explored_sounds.length > 0 && (
        <div className="mt-3">
          <p>Sounds explored</p>
          <RecordedSoundChips sounds={preview.explored_sounds} />
        </div>
      )}
      <button
        className="mt-5 min-h-12 rounded-lg border border-[#06451d] px-4 py-2 text-sm disabled:opacity-50"
        disabled={pending}
        onClick={onShare}
      >
        {sharing ? "Sharing…" : `Share with ${familyName}`}
      </button>
    </div>
  );
}
