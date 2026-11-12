export type AuthFactor = "email_code" | "phone_code" | "totp" | "backup_code" | "passkey";

export function supportedAuthFactors(factors: readonly { strategy: string }[]): AuthFactor[] {
  const supported: AuthFactor[] = [];
  for (const factor of factors) {
    switch (factor.strategy) {
      case "email_code":
      case "phone_code":
      case "totp":
      case "backup_code":
      case "passkey":
        if (!supported.includes(factor.strategy)) supported.push(factor.strategy);
    }
  }
  return supported;
}
