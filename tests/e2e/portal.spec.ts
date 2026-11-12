import { expect, test } from "@playwright/test";

for (const path of ["/admin", "/parent", "/staff"]) {
  test(`${path} requires sign-in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Sign in unavailable" })).toBeVisible();
  });
}

test("invitation capture clears the fragment before entering the auth route", async ({ page, context }) => {
  const token = "a".repeat(43);
  const response = await page.goto(`/invite#token=${token}&purpose=parent`);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page).toHaveURL(/\/invite\/accept$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "You’re invited to Goldleaf" })).toBeVisible();
  const cookie = (await context.cookies()).find((entry) => entry.name === "goldleaf_invite");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(cookie?.path).toBe("/invite");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Finvite%2Faccept/, { timeout: 15_000 });
});

test("invalid invitation fragments clear the URL and any stale invitation", async ({ page, context }) => {
  await context.addCookies([{ name: "goldleaf_invite", value: "a".repeat(43), domain: "localhost", path: "/invite", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/invite#token=invalid&purpose=parent");
  await expect(page.getByRole("heading", { name: "This invitation isn’t available" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  expect((await context.cookies()).find((entry) => entry.name === "goldleaf_invite")).toBeUndefined();
});
