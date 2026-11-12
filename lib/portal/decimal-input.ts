export function parseDecimalMinorUnits(input: string, max: number): number {
  const value = input.trim();
  const match = value.length <= 20 ? /^(\d+)(?:\.(\d{1,2}))?$/.exec(value) : null;
  if (!match) throw new Error("Enter an amount with up to two decimal places");
  const amount = BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (amount > BigInt(max)) throw new Error("Amount exceeds the permitted limit");
  return Number(amount);
}
