import { test } from "node:test";
import assert from "node:assert/strict";
import { adminFormDefaults } from "./portal/admin-form-state";

test("failed child and session actions restore every submitted field; success clears them", () => {
  const values = {
    name: "A child",
    childId: "child",
    date: "2026-10-25",
    time: "01:30",
    location: "A venue",
  };
  assert.deepEqual(
    adminFormDefaults({
      status: "error",
      message: "Retry",
      revision: 0,
      values,
    }),
    values,
  );
  assert.deepEqual(
    adminFormDefaults({
      status: "success",
      message: "Saved",
      revision: 1,
      values,
    }),
    {},
  );
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ChildFields,
  ScheduleFields,
} from "../components/portal/learning/AdminInputFields";

test("rendered controlled fields retain failure values and clear after success", () => {
  const childId = "10000000-0000-4000-8000-000000000001";
  const values = {
    name: "A child",
    childId,
    date: "2026-11-10",
    time: "10:30",
    location: "The studio",
  };
  const failed = adminFormDefaults({
    status: "error",
    message: "Retry",
    revision: 0,
    values,
  });
  const child = renderToStaticMarkup(
    createElement(ChildFields, {
      defaultName: failed.name ?? "",
      pending: false,
    }),
  );
  const schedule = renderToStaticMarkup(
    createElement(ScheduleFields, {
      options: [{ id: childId, family_id: childId, display_name: "A child" }],
      defaults: failed,
      pending: false,
    }),
  );
  assert.match(child, /value="A child"/);
  assert.match(schedule, /value="2026-11-10"/);
  assert.match(schedule, /value="10:30"/);
  assert.match(schedule, /value="The studio"/);
  assert.match(schedule, /selected=""/);
  const cleared = adminFormDefaults({
    status: "success",
    message: "Saved",
    revision: 1,
    values,
  });
  const cleanChild = renderToStaticMarkup(
    createElement(ChildFields, {
      defaultName: cleared.name ?? "",
      pending: false,
    }),
  );
  const cleanSchedule = renderToStaticMarkup(
    createElement(ScheduleFields, {
      options: [],
      defaults: cleared,
      pending: false,
    }),
  );
  assert.match(cleanSchedule, /value="13:00"/);
  assert.doesNotMatch(
    cleanChild + cleanSchedule,
    /A child|2026-11-10|10:30|The studio/,
  );
});
