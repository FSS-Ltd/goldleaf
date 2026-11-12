import assert from "node:assert/strict";
import { test } from "node:test";
import { displayMessages } from "./portal/message-display";
test("browser message projection contains only safe author name and ownership", () => {
  const result = displayMessages(
    [
      {
        sequence: "1",
        author_id: "private-id",
        body: "hello",
        created_at: "2027-01-01T00:00:00Z",
      },
    ],
    [{ id: "private-id", name: "Parent", own: true }],
  );
  assert.deepEqual(result, [
    {
      sequence: "1",
      body: "hello",
      created_at: "2027-01-01T00:00:00Z",
      authorName: "Parent",
      own: true,
    },
  ]);
});
