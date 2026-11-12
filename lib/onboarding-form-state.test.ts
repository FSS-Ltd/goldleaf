import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AssignmentFields,
  FamilyFields,
  StaffEmailField,
} from "./portal/onboarding-form-controls";
import {
  nextOnboardingRevision,
  onboardingDefaults,
  onboardingScopeKey,
} from "./portal/onboarding-form-state";
import { matchesActionActor } from "./portal/action-actor-state";

test("failed family and staff invitations retain all inputs, including committed failure", () => {
  const state = {
    status: "error" as const,
    message: "Delivery failed",
    committed: true,
    revision: 0,
    values: {
      name: "Family A",
      email: "parent@example.invalid",
      founding: true,
    },
  };
  const family = renderToStaticMarkup(
    createElement(FamilyFields, {
      defaults: onboardingDefaults(state),
      full: true,
      pending: false,
      buttonClass: "button",
    }),
  );
  assert.match(family, /value="Family A"/);
  assert.match(family, /value="parent@example.invalid"/);
  assert.match(
    family,
    /<input(?=[^>]*name="founding")(?=[^>]*checked="")(?![^>]*disabled)/,
  );
  assert.match(family, /<button(?=[^>]*disabled)/);
  assert.match(family, /Uncheck founding family/);
  const standardWhenFull = renderToStaticMarkup(
    createElement(FamilyFields, {
      defaults: { ...onboardingDefaults(state), founding: false },
      full: true,
      pending: false,
      buttonClass: "button",
    }),
  );
  assert.doesNotMatch(standardWhenFull, /<button(?=[^>]*disabled)/);
  const staff = renderToStaticMarkup(
    createElement(StaffEmailField, {
      value: onboardingDefaults(state).email ?? "",
      pending: false,
    }),
  );
  assert.match(staff, /value="parent@example.invalid"/);
  const cleared = onboardingDefaults({
    status: "success",
    message: "Sent",
    revision: nextOnboardingRevision(state),
  });
  assert.deepEqual(cleared, {});
  const blankFamily = renderToStaticMarkup(
    createElement(FamilyFields, {
      defaults: cleared,
      full: false,
      pending: false,
      buttonClass: "button",
    }),
  );
  const blankStaff = renderToStaticMarkup(
    createElement(StaffEmailField, {
      value: cleared.email ?? "",
      pending: false,
    }),
  );
  assert.doesNotMatch(
    blankFamily + blankStaff,
    /Family A|parent@example.invalid|checked=""/,
  );
});

test("failed assignments retain attempted selection and actor/target changes reset the form key", () => {
  const ids = ["family-one", "family-two"];
  const state = {
    status: "error" as const,
    message: "Failed",
    values: { familyIds: [ids[1]] },
  };
  const html = renderToStaticMarkup(
    createElement(AssignmentFields, {
      families: ids.map((id) => ({ id, display_name: id })),
      assigned: onboardingDefaults(state).familyIds ?? [],
      pending: false,
    }),
  );
  assert.match(html, /<input(?=[^>]*value="family-two")(?=[^>]*checked="")/);
  assert.doesNotMatch(
    html,
    /<input(?=[^>]*value="family-one")(?=[^>]*checked="")/,
  );
  const actor = { userId: "admin", authSessionId: "session-one" };
  assert.notEqual(
    onboardingScopeKey(actor, "staff-one"),
    onboardingScopeKey(actor, "staff-two"),
  );
  assert.notEqual(
    onboardingScopeKey(actor, "staff-one"),
    onboardingScopeKey({ ...actor, authSessionId: "session-two" }, "staff-one"),
  );
  assert.equal(
    matchesActionActor(actor, "admin", "admin", "session-two"),
    false,
  );
});
