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

test("pricing table shows per-session and weekly prices", async ({ page }) => {
  await page.goto("/#pricing");
  const table = page.locator("#pricing table");
  await expect(table).toContainText("£60 a session");
  await expect(table).toContainText("£270");
  await expect(table).toContainText("£1170");
  await expect(table).not.toContainText("£250");
  await expect(page.getByText("Founding places are full")).toHaveCount(0);
});

test("unknown route shows the custom 404", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "This page has not sprouted yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the home page" })).toBeVisible();
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
});

test("home hero draws a 3D canvas without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && !m.text().includes("_vercel") && errors.push(m.text()));
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("mobile menu opens and lists the pages", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("#mobile-menu").getByRole("link", { name: "How we teach" })).toBeVisible();
});

test("navigation renders without transition errors", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("_vercel")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "See how we teach" }).click();
  await expect(page).toHaveURL(/\/how-we-teach$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Phonics for 2 to 4 year olds, one clear stage at a time" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveCount(1);
  await page.getByRole("link", { name: "About", exact: true }).first().click();
  await expect(page).toHaveURL(/\/about$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Meet Deborah, your Goldleaf tutor" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveCount(1);
  expect(errors).toEqual([]);
});
