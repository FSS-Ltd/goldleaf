import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecordedSoundChips } from "../components/SoundTiles";

test("recorded sound labels remain intact, accessible and ordered", () => {
  const html = renderToStaticMarkup(
    createElement(RecordedSoundChips, {
      sounds: ["oo (book)", "oo (moon)", "sh"],
    }),
  );
  assert.match(html, /oo \(book\).*oo \(moon\).*sh/);
  assert.equal((html.match(/class="chip"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /aria-hidden/);
});
