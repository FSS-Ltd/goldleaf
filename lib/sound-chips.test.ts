import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SoundChips } from "../components/SoundTiles";
import { stages } from "../content/progression";

test("sound chips keep each example with its sound", () => {
  const html = renderToStaticMarkup(createElement(SoundChips, { text: stages[2].sounds }));
  assert.match(html, /<span class="chip">oo \(book\)<\/span><span class="chip">oo \(moon\)<\/span>/);
});

test("each stage has unique sound chip keys", () => {
  for (const stage of stages.filter(({ id }) => [1, 2, 4].includes(id))) {
    const html = renderToStaticMarkup(createElement(SoundChips, { text: stage.sounds }));
    const chips = [...html.matchAll(/<span class="chip">(.*?)<\/span>/g)].map((match) => match[1]);
    assert.equal(new Set(chips).size, chips.length, stage.name);
  }
});
