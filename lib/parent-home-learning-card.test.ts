import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearningCard } from "../components/portal/parent-home/LearningCards";
import type { Child, PublishedLearningUpdate } from "./portal/learning-schemas";

const child: Child = {
  id: "child-2",
  family_id: "family-1",
  display_name: "Robin",
};
const update: PublishedLearningUpdate = {
  id: "update-1",
  session_id: "session-1",
  child_id: child.id,
  family_id: child.family_id,
  body: "Shared note",
  stage: null,
  focus: "Listening to sounds",
  practice: null,
  explored_sounds: [],
  published_at: "2027-01-02T00:00:00Z",
  published_by: "staff-1",
};

test("latest focus identifies the child and links directly to that child's learning", () => {
  const html = renderToStaticMarkup(
    createElement(LearningCard, { latest: { child, update } }),
  );
  assert.match(html, /Robin/);
  assert.match(html, /Listening to sounds/);
  assert.match(html, /href="\/parent\/learning\?child=child-2"/);
});

test("empty learning links to the unselected learning view", () => {
  const html = renderToStaticMarkup(
    createElement(LearningCard, { latest: undefined }),
  );
  assert.match(html, /href="\/parent\/learning"/);
});

test("published stage uses its actual canonical label", () => {
  const html = renderToStaticMarkup(
    createElement(LearningCard, {
      latest: { child, update: { ...update, stage: 1 } },
    }),
  );
  assert.match(html, /Stage 1/);
  assert.doesNotMatch(html, /mastered|completed/i);
});
