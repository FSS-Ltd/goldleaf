import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FamilyWorkspace } from "../components/portal/admin/FamilyWorkspace";

const child = createElement("button", null, "Register child");

test("pending family navigation hides and disables the retained workspace", () => {
  const html = renderToStaticMarkup(FamilyWorkspace({ pending: true, children: child }));
  assert.match(html, /<div hidden="" inert="">.*Register child/);
  assert.match(html, /role="status" class="sr-only">Opening family/);
  assert.doesNotMatch(html, /<main\b/);
});

test("settled family workspace remains available without a loading indicator", () => {
  const html = renderToStaticMarkup(FamilyWorkspace({ pending: false, children: child }));
  assert.match(html, /<div><button>Register child/);
  assert.doesNotMatch(html, /\bhidden=|\binert=|Opening family/);
});

test("family selector connects transition state to the server-rendered workspace", async () => {
  const { readFile } = await import("node:fs/promises");
  const selector = await readFile("components/portal/admin/FamilySelector.tsx", "utf8");
  const page = await readFile("app/(portal)/(provider)/admin/children/page.tsx", "utf8");
  assert.match(selector, /<FamilyWorkspace pending=\{pending\}>\{children\}<\/FamilyWorkspace>/);
  assert.match(page, /<FamilySelector[\s\S]*<RegisterChildForm[\s\S]*<ScheduleSessionForm[\s\S]*<\/FamilySelector>/);
});
