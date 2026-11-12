export type OnboardingValues = {
  name?: string;
  email?: string;
  founding?: boolean;
  familyIds?: string[];
};
export type OnboardingActionState = {
  status: "idle" | "success" | "error";
  message: string;
  revision?: number;
  nextRequestId?: string;
  attemptId?: string;
  committed?: boolean;
  values?: OnboardingValues;
};

/** Failed actions restore submitted values, including a committed delivery failure. */
export function onboardingDefaults(
  state: OnboardingActionState,
): OnboardingValues {
  return state.status === "error" ? (state.values ?? {}) : {};
}
export function nextOnboardingRevision(state: OnboardingActionState): number {
  return (state.revision ?? 0) + 1;
}

/** A changed actor or target remounts only that form's editing state. */
export function onboardingScopeKey(
  actor: { userId: string; authSessionId: string },
  target = "",
): string {
  return JSON.stringify([actor.userId, actor.authSessionId, target]);
}
