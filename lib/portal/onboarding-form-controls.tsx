"use client";
import { useState } from "react";
import type { ActionActor } from "./action-actor";
import type { OnboardingValues } from "./onboarding-form-state";

const field =
  "mt-2 min-h-12 w-full rounded-lg border border-[#e3d7c3] bg-white px-4 py-3 text-[#1d1b19] focus:outline-2 focus:outline-offset-2 focus:outline-[#06451d]";
export function OnboardingActorFields({ actor }: { actor: ActionActor }) {
  return (
    <>
      <input type="hidden" name="actorUserId" value={actor.userId} />
      <input type="hidden" name="actorSessionId" value={actor.authSessionId} />
    </>
  );
}
export function FamilyFields({
  defaults,
  full,
  pending,
  committed = false,
  buttonClass,
}: {
  defaults: OnboardingValues;
  full: boolean;
  pending: boolean;
  committed?: boolean;
  buttonClass: string;
}) {
  const [name, setName] = useState(defaults.name ?? "");
  const [email, setEmail] = useState(defaults.email ?? "");
  const [founding, setFounding] = useState(defaults.founding ?? false);
  return (
    <>
      <div>
        <label htmlFor="family-name" className="font-medium">
          Family name
        </label>
        <input
          id="family-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          required
          maxLength={120}
          autoComplete="organization"
          className={field}
        />
      </div>
      <div>
        <label htmlFor="parent-email" className="font-medium">
          Parent email
        </label>
        <input
          id="parent-email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          required
          type="email"
          maxLength={254}
          autoComplete="email"
          className={field}
        />
      </div>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="founding"
          checked={founding}
          onChange={(event) => setFounding(event.target.checked)}
          disabled={pending || (full && !founding)}
          className="mt-1 size-5 accent-[#06451d]"
        />
        <span>
          <span className="block font-medium">Founding family</span>
          <span className="text-sm text-[#35594a]">
            {full
              ? "All founding places are currently assigned."
              : "Reserve one of the available founding places."}
          </span>
        </span>
      </label>
      {full && founding && (
        <p role="status" className="text-sm text-red-800">
          All founding places are assigned. Uncheck founding family to create a
          standard family.
        </p>
      )}
      <div className="border-t border-[#e3d7c3] pt-5">
        <button
          className={buttonClass}
          disabled={pending || committed || (full && founding)}
        >
          {pending ? "Creating…" : "Create family and send invitation"}
        </button>
      </div>
    </>
  );
}
export function StaffEmailField({
  value,
  pending,
}: {
  value: string;
  pending: boolean;
}) {
  const [email, setEmail] = useState(value);
  return (
    <label className="block text-sm font-medium">
      Staff email
      <input
        className="mt-2 w-full rounded-lg border border-[#e3d7c3] bg-white px-4 py-3 text-[#1b3022]"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={pending}
        required
        autoComplete="email"
      />
    </label>
  );
}
export function AssignmentFields({
  families,
  assigned,
  pending,
}: {
  families: { id: string; display_name: string | null }[];
  assigned: string[];
  pending: boolean;
}) {
  const [selected, setSelected] = useState(assigned);
  return (
    <fieldset disabled={pending}>
      <legend className="sr-only">Family access</legend>
      <div className="divide-y divide-[#e3d7c3] rounded-lg border border-[#e3d7c3] bg-white">
        {families.map((family) => (
          <label
            key={family.id}
            className="flex min-h-12 items-center gap-3 px-4 py-3 text-sm"
          >
            <input
              type="checkbox"
              name="familyId"
              value={family.id}
              checked={selected.includes(family.id)}
              onChange={(event) => {
                const checked = event.target.checked;
                setSelected((current) =>
                  checked
                    ? [...current, family.id]
                    : current.filter((id) => id !== family.id),
                );
              }}
            />
            {family.display_name ?? "Unnamed family"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
