import assert from "node:assert/strict";
import test from "node:test";
import { closeOpenDialog } from "./portal/dialog-lifecycle";

test("hiding or unmounting a route closes an open modal once", () => {
  let calls = 0;
  const dialog = {
    open: true,
    close() { this.open = false; calls++; },
  };
  closeOpenDialog(dialog);
  assert.equal(dialog.open, false);
  assert.equal(calls, 1);
  closeOpenDialog(dialog);
  closeOpenDialog(null);
  assert.equal(calls, 1);
});
