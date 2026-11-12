"use client";
import { button } from "./format";
export function PrintButton() {
  return (
    <button type="button" className={button} onClick={() => window.print()}>
      Print invoice
    </button>
  );
}
