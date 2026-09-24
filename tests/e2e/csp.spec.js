import { expect, test } from "@playwright/test";

test("quiz works under same-origin CSP and renders model strings as text", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/csp-fixture");
  await expect(page.locator(".yaq-head")).toContainText("<script>alert(1)</script>");
  await expect(page.locator(".yaq-activity em")).toHaveText("nested prose");
  const option = page.locator(".yaq-FBQuestion option").last();
  await expect(option).toHaveText("<img src=x onerror=alert(1)>");
  await expect(page.locator(".yaq-root script, .yaq-root img")).toHaveCount(0);
  await page.locator(".yaq-spoiler-inline").click();
  await expect(page.locator(".yaq-spoiler-inline")).not.toHaveClass(/yaq-spoiler-inline-hidden/);
  await page.locator(".yaq-FBQuestion select").selectOption("safe");
  await page.locator(".yaq-FBQuestion input").fill("2");
  await page.getByRole("button", { name: "Corriger" }).click();
  await expect(page.locator('[data-role="correctMarker"]')).toHaveCount(2);
  await expect(page.locator('[data-role="correctMarker"]').first()).toBeVisible();
  await expect(page.locator('[data-role="correctMarker"]').last()).toBeVisible();
  await expect(page.locator('[data-role="correctMarker"] [aria-hidden="true"]').first()).toHaveText("✔");
  await expect(page.locator('[data-role="correctMarker"] .yaq-feedback-text').first()).toHaveText("Correct");
  expect(errors).toEqual([]);
});
