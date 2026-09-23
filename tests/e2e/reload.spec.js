import { expect, test } from "@playwright/test";

test("locally saved progress survives a real browser reload", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/quiz/");
  const firstQuiz = page.locator(".yaq-root").first();
  const firstAnswer = firstQuiz.locator('input[type="text"]').first();
  await firstAnswer.fill("Yalta");
  await firstQuiz.getByText("Corriger", { exact: true }).click();
  await expect(firstAnswer).toBeDisabled();
  await expect.poll(() => page.evaluate(() => localStorage.length)).toBeGreaterThan(0);

  await page.reload();

  const restored = page.locator(".yaq-root").first().locator('input[type="text"]').first();
  await expect(restored).toHaveValue("Yalta");
  await expect(restored).toBeDisabled();
  expect(consoleErrors).toEqual([]);
});
