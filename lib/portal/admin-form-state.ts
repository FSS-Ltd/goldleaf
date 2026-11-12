export type AdminFormValues = {
  name?: string;
  childId?: string;
  date?: string;
  time?: string;
  location?: string;
};
export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
  revision: number;
  values?: AdminFormValues;
};

/** Error responses restore submitted values; a confirmed commit starts fresh. */
export function adminFormDefaults(state: AdminActionState): AdminFormValues {
  return state.status === "error" ? (state.values ?? {}) : {};
}
