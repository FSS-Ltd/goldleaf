import type { Session } from "./learning-schemas";
const labels: Record<Session["status"], string> = {
  scheduled: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
export function sessionStatusLabel(status: Session["status"]): string {
  return labels[status];
}
