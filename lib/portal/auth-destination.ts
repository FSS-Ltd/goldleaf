export function authDestination(value: string | undefined): "/portal" | "/invite/accept" {
  return value === "/invite/accept" ? "/invite/accept" : "/portal";
}
