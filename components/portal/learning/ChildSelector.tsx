import type { Child } from "@/lib/portal/learning-schemas";

export function ChildSelector({
  options,
  selected,
}: {
  options: (Child & { familyName?: string })[];
  selected?: string;
}) {
  if (options.length === 0)
    return (
      <p className="mt-5 text-sm">
        No children have been added to your family yet.
      </p>
    );
  if (options.length === 1)
    return (
      <p className="mt-4 text-sm text-[#35594a]">{options[0].display_name}</p>
    );
  return (
    <form method="get" className="mt-5 max-w-sm">
      <label className="block text-sm font-medium">
        Child
        <select
          className="mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3"
          name="child"
          defaultValue={selected ?? ""}
          required
        >
          <option value="" disabled>
            Select a child
          </option>
          {options.map((child) => (
            <option key={child.id} value={child.id}>
              {child.display_name}
              {child.familyName ? ` · ${child.familyName}` : ""}
            </option>
          ))}
        </select>
      </label>
      <button className="mt-3 min-h-12 rounded-lg border border-[#06451d] px-4 text-sm">
        Show record
      </button>
    </form>
  );
}
