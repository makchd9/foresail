import { expect, test } from "@playwright/test";

/**
 * The critical path a reviewer walks: sign in, create a deal, move it through
 * the pipeline, annotate it, and clean up. Uses the seeded demo login.
 */

const DEMO_EMAIL = "demo@foresail.app";
const DEMO_PASSWORD = "demo1234";

test("demo user can create, move, annotate, and delete a deal", async ({ page }) => {
  const dealTitle = `E2E Deal ${Date.now()}`;

  // Sign in
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/app**");

  // Board renders with the seeded pipeline
  await page.goto("/app/deals");
  await expect(page.locator('section[aria-label="Lead column"]')).toBeVisible();

  // Create a deal in Lead
  await page.getByRole("button", { name: "New deal" }).click();
  await page.getByLabel("Title").fill(dealTitle);
  await page.getByLabel("Value (USD)").fill("12345");
  await page.getByRole("button", { name: "Create deal" }).click();
  await expect(page.getByText("Deal created")).toBeVisible();
  const card = page.locator("article", { hasText: dealTitle }).first();
  await expect(card).toBeVisible();

  // Move it to Qualified via the card menu (keyboard/menu path, no drag needed)
  await card.hover();
  await card.getByRole("button", { name: `Actions for ${dealTitle}` }).click();
  await page.getByRole("menuitem", { name: "Qualified" }).click();
  await expect(
    page.locator('section[aria-label="Qualified column"] article', { hasText: dealTitle }),
  ).toBeVisible();

  // Open the detail page and add a note
  await page.locator("article a", { hasText: dealTitle }).click();
  await page.waitForURL("**/app/deals/**");
  await page.getByPlaceholder(/Log a call/).fill("Automated check-in from the e2e suite.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Automated check-in from the e2e suite.")).toBeVisible();

  // The activity trail recorded the stage change
  await page.getByRole("tab", { name: /Activity/ }).click();
  await expect(page.getByText("moved deal from Lead to Qualified").first()).toBeVisible();

  // Delete (with confirm) and land back on the board
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete deal" }).click();
  await page.waitForURL("**/app/deals");
  await expect(page.locator("article", { hasText: dealTitle })).toHaveCount(0);
});

test("viewer role is read-only on the board", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("viewer@foresail.app");
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/app**");

  await page.goto("/app/deals");
  await expect(page.locator('section[aria-label="Lead column"]')).toBeVisible();
  // No mutation affordances for viewers
  await expect(page.getByRole("button", { name: "New deal" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add deal" })).toHaveCount(0);
});
