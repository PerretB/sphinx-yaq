import { expect, test } from "@playwright/test";

test("mixed-language Sphinx output and progress survive a UI language change", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/i18n.html");
  const fr = page.locator(".yaq-root").nth(0);
  const en = page.locator(".yaq-root").nth(1);
  await expect(fr.getByRole("button", { name: "Vrai", exact: true })).toHaveText("V");
  await expect(en.getByRole("button", { name: "True", exact: true })).toHaveText("T");
  await expect(en.getByRole("button", { name: "Show hidden text" })).toHaveAttribute("lang", "en");
  await en.getByRole("button", { name: "Show hidden text" }).click();
  await expect(en.locator(".yaq-spoiler-inline")).toHaveAttribute("lang", "fr");
  await fr.getByRole("textbox").fill("Paris");
  await fr.getByRole("button", { name: "Vrai", exact: true }).click();
  await fr.getByRole("button", { name: "Vérifier les réponses" }).click();
  await expect(fr.getByRole("status")).toContainText("2 réponses correctes");
  // Emulate rebuilding the same page with English UI, retaining authored models,
  // URL and quiz identifiers. Intercept only HTML before the runtime initializes.
  await page.route("**/i18n.html", async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/data-i18n="[^"]*"/g, 'data-i18n="{}"');
    await route.fulfill({ response, body });
  });
  await page.reload();
  await expect(fr.getByRole("button", { name: "Restart" })).toBeVisible();
  await expect(fr.getByRole("textbox")).toHaveValue("Paris");
  await expect(fr.getByRole("textbox")).toBeDisabled();
  await expect(fr.getByRole("button", { name: "True", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
