import { expect, test } from "@playwright/test";

test("empty enquiry shows field errors", async ({ page }) => {
  await page.goto("/enquire");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText("Please enter your name")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address")).toBeVisible();
  await expect(page.getByText("Please tick the box so we can reply to you")).toBeVisible();
});

test("valid enquiry shows the success state (dev dry run, no key)", async ({ page }) => {
  await page.goto("/enquire");
  await page.getByLabel("Your name").fill("Sam Parent");
  await page.getByLabel("Email").fill("sam@example.com");
  await page.getByText("3 years").click();
  await page.getByText("3", { exact: true }).first().click();
  await page.getByText("At our home").click();
  await page.getByLabel("Your area or postcode district").fill("TN23");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
});
