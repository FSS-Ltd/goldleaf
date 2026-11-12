export function invoicePaymentStatus(totalPence: number, paidPence: number): "unpaid" | "partially-paid" | "paid" {
  if (!Number.isSafeInteger(totalPence) || !Number.isSafeInteger(paidPence) || totalPence < 0 || paidPence < 0 || paidPence > totalPence) {
    throw new Error("Invalid invoice balance");
  }
  if (paidPence === totalPence) return "paid";
  return paidPence === 0 ? "unpaid" : "partially-paid";
}
