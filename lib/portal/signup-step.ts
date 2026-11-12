export function signupStep(status: string | null, missing: readonly string[], unverified: readonly string[]): "complete" | "username" | "verify" | "unsupported" {
  if (status === "complete") return "complete";
  if (missing.includes("username")) return "username";
  if (unverified.includes("email_address")) return "verify";
  return "unsupported";
}
