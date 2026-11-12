export function billingSettingsStatus(pending: boolean, dirty: boolean, failed: boolean): string {
  if (pending) return "Saving…";
  return dirty || failed ? "Unsaved changes" : "Saved settings";
}
