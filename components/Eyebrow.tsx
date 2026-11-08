export function Eyebrow({
  children,
  left = false,
  dark = false,
}: {
  children: React.ReactNode;
  left?: boolean;
  dark?: boolean;
}) {
  return <p className={`eyebrow ${left ? "left" : ""} ${dark ? "on-dark" : ""}`}>{children}</p>;
}
