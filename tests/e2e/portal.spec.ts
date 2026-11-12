import { expect, test } from "@playwright/test";

for (const path of ["/admin", "/admin/staff", "/admin/messages", "/parent/messages", "/staff/messages", "/parent", "/staff", "/account", "/admin/invoices", "/admin/invoices/new", "/admin/billing-settings", "/parent/billing", "/parent/billing/10000000-0000-4000-8000-000000000001?family=10000000-0000-4000-8000-000000000002", "/parent/billing/10000000-0000-4000-8000-000000000001/print?family=10000000-0000-4000-8000-000000000002"]) {
  test(`${path} requires sign-in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Sign in unavailable" })).toBeVisible();
  });
}

test("portal event stream requires authentication", async ({ request }) => {
  const response = await request.get("/api/portal/events?role=parent");
  expect(response.status()).toBe(401);
});

test("account security is unavailable without the identity provider", async ({ page }) => {
  await page.goto("/session-task/reset-password");
  await expect(page.getByRole("heading", { name: "Account security unavailable" })).toBeVisible();
});

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

test("staff invitation capture preserves its purpose without exposing the fragment", async ({ page, context }) => {
  const token = "b".repeat(43);
  await page.goto(`/invite#token=${token}&purpose=staff`);
  await expect(page).toHaveURL(/\/invite\/accept$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "You’re invited to Goldleaf" })).toBeVisible();
  const cookie = (await context.cookies()).find((entry) => entry.name === "goldleaf_invite");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.path).toBe("/invite");
  expect(decodeURIComponent(cookie?.value ?? "")).toBe(`staff:${token}`);
});

test("invalid invitation fragments clear the URL and any stale invitation", async ({ page, context }) => {
  await context.addCookies([{ name: "goldleaf_invite", value: "a".repeat(43), domain: "localhost", path: "/invite", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/invite#token=invalid&purpose=parent");
  await expect(page.getByRole("heading", { name: "This invitation isn’t available" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  expect((await context.cookies()).find((entry) => entry.name === "goldleaf_invite")).toBeUndefined();
});

test("an invitation page without a fragment clears any stale invitation", async ({ page, context }) => {
  await context.addCookies([{ name: "goldleaf_invite", value: "a".repeat(43), domain: "localhost", path: "/invite", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/invite");
  await expect(page.getByRole("heading", { name: "This invitation isn’t available" })).toBeVisible();
  expect((await context.cookies()).find((entry) => entry.name === "goldleaf_invite")).toBeUndefined();
});
