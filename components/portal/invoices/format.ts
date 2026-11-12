export function pounds(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}
export function invoiceDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
export const card =
  "rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-5 sm:p-7";
export const subcard =
  "rounded-xl border border-[#e3d7c3] bg-[#fef8f3] p-4 sm:p-5";
export const field =
  "mt-1 block w-full rounded-lg border border-[#d7c9b4] bg-[#fffdfa] px-3 py-2 text-sm text-[#1b3022] focus:outline-2 focus:outline-[#06451d] disabled:opacity-60";
export const button =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#06451d] px-5 py-2 text-sm font-medium text-white hover:bg-[#175128] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06451d] disabled:cursor-not-allowed disabled:opacity-50";
export const secondary =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[#bdae96] px-5 py-2 text-sm font-medium text-[#06451d] hover:bg-[#fffdfa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06451d] disabled:cursor-not-allowed disabled:opacity-50";
