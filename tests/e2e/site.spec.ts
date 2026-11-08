import { expect, test } from "@playwright/test";

const routes = ["/", "/how-we-teach", "/about", "/enquire", "/privacy"];

for (const path of routes) {
  test(`${path} returns 200 with one h1`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
  });
}

test("sitemap and robots respond", async ({ request }) => {
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/robots.txt")).status()).toBe(200);
});

test("pricing table shows the client's numbers", async ({ page }) => {
  await page.goto("/#pricing");
  const table = page.locator("#pricing table");
  await expect(table).toContainText("£225");
  await expect(table).toContainText("£975");
  await expect(table).toContainText("£185");
  await expect(table).toContainText("£802");
});
