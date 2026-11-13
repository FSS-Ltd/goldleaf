"use client";
import { useState } from "react";
import { site } from "@/content/site";
import { formatUkSession, ukLocalToIso } from "@/lib/portal/uk-time";
import type { Child } from "@/lib/portal/learning-schemas";
import type { AdminFormValues } from "@/lib/portal/admin-form-state";
const input =
  "mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3";
const button =
  "min-h-12 rounded-lg bg-[#06451d] px-5 py-3 text-sm text-white disabled:opacity-50";

export function ChildFields({
  defaultName,
  pending,
}: {
  defaultName: string;
  pending: boolean;
}) {
  const [name, setName] = useState(defaultName);
  return (
    <label className="block text-sm font-medium">
      Child’s display name
      <input
        className={input}
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={120}
        disabled={pending}
        required
      />
    </label>
  );
}

export function ScheduleFields({
  options,
  defaults,
  pending,
}: {
  options: Child[];
  defaults: AdminFormValues;
  pending: boolean;
}) {
  const [childId, setChildId] = useState(defaults.childId ?? "");
  const [date, setDate] = useState(defaults.date ?? "");
  const [time, setTime] = useState(defaults.time ?? site.sessionStartTime);
  const [location, setLocation] = useState(defaults.location ?? "");
  let end: ReturnType<typeof formatUkSession> | null = null;
  let invalidTime = false;
  if (date && time) {
    try {
      end = formatUkSession(ukLocalToIso(date, time), site.sessionMinutes);
    } catch {
      invalidTime = true;
    }
  }
  return (
    <>
      <label className="block text-sm font-medium">
        Child
        <select
          className={input}
          name="childId"
          value={childId}
          onChange={(event) => setChildId(event.target.value)}
          disabled={pending}
          required
        >
          <option value="" disabled>
            Select a child
          </option>
          {options.map((child) => (
            <option key={child.id} value={child.id}>
              {child.display_name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Date
        <input
          className={input}
          name="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={pending}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        UK start time
        <input
          className={input}
          name="time"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          disabled={pending}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Location <span className="font-normal">(optional)</span>
        <input
          className={input}
          name="location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          maxLength={200}
          disabled={pending}
        />
      </label>
      <p className="text-sm text-[#35594a]">
        Sessions last {site.sessionMinutes} minutes.
        {end && ` Ends ${end.endDay} at ${end.endTime}.`}
      </p>
      {invalidTime && (
        <p role="alert" className="text-sm">
          Choose another time: this UK clock time is invalid or occurs twice.
        </p>
      )}
      <button
        className={button}
        disabled={pending || options.length === 0 || invalidTime}
      >
        {pending ? "Scheduling…" : "Schedule session"}
      </button>
    </>
  );
}
