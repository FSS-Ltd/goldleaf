"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Family = { id: string; display_name: string | null };

export function FamilySelector({
  families,
  selectedId,
}: {
  families: Family[];
  selectedId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form method="get" className="mt-6 max-w-xl" aria-busy={pending}>
      <label className="block text-sm font-medium">
        Family
        <select
          key={selectedId}
          className="mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3"
          name="family"
          defaultValue={selectedId}
          disabled={pending}
          onChange={(event) => {
            const value = event.currentTarget.value;
            startTransition(() =>
              router.push(
                value
                  ? `/admin/children?family=${encodeURIComponent(value)}`
                  : "/admin/children",
                { scroll: false },
              ),
            );
          }}
        >
          <option value="">Select a family</option>
          {families.map((family) => (
            <option key={family.id} value={family.id}>
              {family.display_name ?? "Unnamed family"}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button className="mt-3 min-h-12 rounded-lg border border-[#06451d] px-5 text-sm">
          Open family
        </button>
      </noscript>
      {pending && (
        <p role="status" className="mt-2 text-sm">
          Opening family…
        </p>
      )}
    </form>
  );
}
