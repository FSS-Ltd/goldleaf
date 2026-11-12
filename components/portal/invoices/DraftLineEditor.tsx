"use client";

import { field, subcard } from "./format";

export type DraftLineInput = {
  key: string;
  description: string;
  quantity: string;
  days: string;
  cadence: string;
  serviceDate: string;
};

export function DraftLineEditor({
  line,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  line: DraftLineInput;
  index: number;
  canRemove: boolean;
  onChange: (field: keyof Omit<DraftLineInput, "key">, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <fieldset className={`${subcard} space-y-4`}>
      <legend className="px-1 text-sm font-semibold">
        Service line {index + 1}
      </legend>
      <label className="block text-sm">
        Description
        <input
          className={field}
          required
          value={line.description}
          onChange={(event) => onChange("description", event.target.value)}
          maxLength={500}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Service date
          <input
            className={field}
            type="date"
            required
            value={line.serviceDate}
            onChange={(event) => onChange("serviceDate", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Cadence
          <select
            className={field}
            required
            value={line.cadence}
            onChange={(event) => onChange("cadence", event.target.value)}
          >
            <option value="">Select cadence</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="text-sm">
          Number of children
          <input
            className={field}
            type="number"
            min="1"
            max="1000000"
            step="1"
            required
            value={line.quantity}
            onChange={(event) => onChange("quantity", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Days per week
          <select
            className={field}
            required
            value={line.days}
            onChange={(event) => onChange("days", event.target.value)}
          >
            <option value="">Select days</option>
            {[1, 2, 3, 4, 5].map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-[#5a6a5e]">
        The weekly or monthly quote is per child.
      </p>
      {canRemove && (
        <button
          type="button"
          className="min-h-10 text-sm underline"
          onClick={onRemove}
        >
          Remove line {index + 1}
        </button>
      )}
    </fieldset>
  );
}
