import type { MessageAttentionCounts } from "@/lib/portal/message-attention";

export function MessageAttention({
  role,
  counts,
  mobile = false,
}: {
  role: "admin" | "parent" | "staff";
  counts: MessageAttentionCounts | null;
  mobile?: boolean;
}) {
  const badgeClass = `${mobile ? "absolute right-0 top-0" : ""} rounded-full bg-[#06451d] px-1.5 text-xs font-semibold leading-5 text-white`;
  if (!counts) {
    return (
      <>
        <span aria-hidden="true" title="Message counts unavailable" className={badgeClass}>!</span>
        <span className="sr-only"> (Message counts unavailable)</span>
      </>
    );
  }
  const unread = BigInt(counts.unread);
  const requests = role === "admin" ? BigInt(counts.openRequests) : BigInt(0);
  const total = unread + requests;
  if (total === BigInt(0)) return null;
  return (
    <>
      <span className={badgeClass}>
        {total > BigInt(99) ? "99+" : total.toString()}
      </span>
      <span className="sr-only">
        {` (${unread} unread ${unread === BigInt(1) ? "message" : "messages"}${role === "admin" ? `, ${requests} open ${requests === BigInt(1) ? "request" : "requests"}` : ""})`}
      </span>
    </>
  );
}
