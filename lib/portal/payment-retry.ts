export function paymentMatches(
  payment: { amountPence: number; paidOn: string; reference: string },
  recorded: { amount_pence: number; paid_on: string; reference: string } | null,
): boolean {
  return recorded !== null && recorded.amount_pence === payment.amountPence && recorded.paid_on === payment.paidOn && recorded.reference === payment.reference;
}
