import { z } from "zod";
const event = z
  .object({
    type: z.enum(["ready", "change", "access_changed", "unavailable"]),
  })
  .strict();
export type PortalEvent = z.infer<typeof event>["type"];
export function parsePortalEvent(frame: string): PortalEvent | null {
  const lines = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data: "));
  if (lines.length !== 1 || lines[0].length > 256) return null;
  try {
    const result = event.safeParse(JSON.parse(lines[0].slice(6)));
    return result.success ? result.data.type : null;
  } catch {
    return null;
  }
}
