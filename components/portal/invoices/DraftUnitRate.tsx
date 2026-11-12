import { pounds } from "./format";

export function DraftUnitRate({ amountPence, cadence, basis }: {
  amountPence: number;
  cadence: "weekly" | "monthly";
  basis?: "periods" | "children";
}) {
  return <>{pounds(amountPence)} per {basis === "children" ? `${cadence === "weekly" ? "week" : "month"} per child` : "period"}</>;
}
