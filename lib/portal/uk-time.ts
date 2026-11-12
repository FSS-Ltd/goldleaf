const localParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function partsAt(milliseconds: number) {
  const values = Object.fromEntries(localParts.formatToParts(new Date(milliseconds)).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

/** Reject nonexistent and ambiguous wall times rather than guessing the intended offset. */
export function ukLocalToIso(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("Enter a valid date and time.");
  const local = `${date}T${time}`;
  const naive = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 16) !== local) throw new Error("Enter a valid date and time.");
  const offsets = new Set<number>();
  for (let hour = -36; hour <= 36; hour += 6) {
    const probe = naive + hour * 3600000;
    const displayed = Date.parse(`${partsAt(probe)}:00Z`);
    offsets.add(displayed - probe);
  }
  const matches = [...offsets].map((offset) => naive - offset).filter((candidate) => partsAt(candidate) === local);
  if (matches.length !== 1) throw new Error("Choose another time: this UK clock time is missing or occurs twice.");
  return new Date(matches[0]).toISOString();
}

export function formatUkSession(start: string, duration: number) {
  const date = new Date(start);
  const end = new Date(date.getTime() + duration * 60000);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return { day: day.format(date), time: `${clock.format(date)}–${clock.format(end)}` };
}
