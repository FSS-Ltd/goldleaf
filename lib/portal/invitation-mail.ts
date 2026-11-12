export type InvitationMessage = { from: string; to: string; subject: string; text: string };

export async function sendInvitationMail(
  send: (message: InvitationMessage) => Promise<{ error: unknown; data: { id: string } | null }>,
  input: { from: string; to: string; token: string; origin: string; requireHttps: boolean; purpose?: "parent" | "staff" },
): Promise<"sent" | "failed"> {
  try {
    const url = new URL("/invite", input.origin);
    if (input.requireHttps && url.protocol !== "https:") return "failed";
    url.hash = new URLSearchParams({ token: input.token, purpose: input.purpose ?? "parent" }).toString();
    const result = await send({
      from: input.from, to: input.to, subject: "Your Goldleaf invitation",
      text: `You have been invited to join Goldleaf. Open this link to continue:\n\n${url.href}\n\nThis invitation expires in seven days.`,
    });
    return !result.error && result.data?.id ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
