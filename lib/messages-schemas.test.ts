import assert from "node:assert/strict";
import { test } from "node:test";
import {
  messageInput,
  messageReadInput,
  messageSequence,
} from "./portal/messages-schemas";
const familyId = "10000000-0000-4000-8000-000000000001";
const operationId = "20000000-0000-4000-8000-000000000001";
test("message input rejects authority injection, empty bodies and invalid bigint cursors", () => {
  assert.equal(
    messageInput.parse({ familyId, operationId, body: " hello " }).body,
    "hello",
  );
  for (const input of [
    { familyId, operationId, body: " " },
    { familyId, operationId, body: "x", subject: "forged" },
    { familyId, operationId, body: "x".repeat(4001) },
  ])
    assert.equal(messageInput.safeParse(input).success, false);
  for (const through of ["0", "-1", "01", "abc", "9223372036854775808", "1.1"])
    assert.equal(
      messageReadInput.safeParse({ familyId, through }).success,
      false,
    );
  assert.equal(
    messageSequence.parse("9223372036854775807"),
    "9223372036854775807",
  );
});
