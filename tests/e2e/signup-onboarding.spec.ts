import { expect, test } from "@playwright/test";

/**
 * A brand-new user signs up, verifies their email via the demo-mode link,
 * and bootstraps their fresh workspace with sample data.
 */

test("signup → verify email → load sample data", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("a-strong-password");
  await page.getByRole("button", { name: "Create free account" }).click();

  // Demo-mail mode surfaces the verification link on-screen
  await expect(page.getByText("Your account is ready")).toBeVisible();
  await page.getByRole("link", { name: "Verify my email" }).click();
  await expect(page.getByText("Email verified")).toBeVisible();
  await page.getByRole("link", { name: "Go to dashboard" }).click();
  await page.waitForURL("**/app**");

  // Fresh workspace: dashboard empty state points at deals
  await expect(page.getByText("Nothing to forecast yet")).toBeVisible();

  // Load sample data from the deals empty state
  await page.goto("/app/deals");
  await page.getByRole("button", { name: "Load sample data" }).click();
  await expect(page.getByText("Sample data loaded — explore away")).toBeVisible();
  await expect(page.locator("article", { hasText: "Globex — Enterprise license" })).toBeVisible();

  // Dashboard now has a forecast
  await page.goto("/app");
  await expect(page.getByText("Open pipeline", { exact: true })).toBeVisible();
  await expect(page.getByText("Weighted forecast", { exact: true })).toBeVisible();
});
