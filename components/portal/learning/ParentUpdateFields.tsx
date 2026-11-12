import { stages } from "@/content/progression";

export type DraftFields = {
  body: string;
  stage: string;
  focus: string;
  practice: string;
  sounds: string;
};
const field =
  "mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3";

export function ParentUpdateFields({
  values,
  pending,
  onChange,
}: {
  values: DraftFields;
  pending: boolean;
  onChange: (field: keyof DraftFields, value: string) => void;
}) {
  return (
    <>
      <label className="mt-4 block text-sm font-medium">
        Update
        <textarea
          className={field}
          rows={5}
          value={values.body}
          maxLength={10000}
          disabled={pending}
          onChange={(event) => onChange("body", event.target.value)}
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Stage (optional)
        <select
          className={field}
          value={values.stage}
          disabled={pending}
          onChange={(event) => onChange("stage", event.target.value)}
        >
          <option value="">Not recorded</option>
          {stages.map((stage) => (
            <option value={stage.id} key={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm font-medium">
        Focus (optional)
        <textarea
          className={field}
          rows={2}
          value={values.focus}
          maxLength={1000}
          disabled={pending}
          onChange={(event) => onChange("focus", event.target.value)}
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Practice (optional)
        <textarea
          className={field}
          rows={2}
          value={values.practice}
          maxLength={1000}
          disabled={pending}
          onChange={(event) => onChange("practice", event.target.value)}
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Sounds explored (optional, one per line)
        <textarea
          className={field}
          rows={3}
          value={values.sounds}
          disabled={pending}
          onChange={(event) => onChange("sounds", event.target.value)}
        />
      </label>
    </>
  );
}
