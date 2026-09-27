import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function checkQuizAxe(page) {
  const results = await new AxeBuilder({ page }).include(".yaq-root").analyze();
  expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact))).toEqual([]);
}

async function expectIconFeedback(marker, label) {
  await expect(marker).toHaveAttribute("title", label);
  await expect(marker.locator(".yaq-feedback-text")).toHaveCSS("position", "absolute");
  await expect(marker.locator(".yaq-feedback-text")).toHaveCSS("clip", "rect(0px, 0px, 0px, 0px)");
  await expect(marker.locator('[aria-hidden="true"]')).toBeVisible();
}

test("YAQ styles take precedence over later theme rules", async ({ page }) => {
  await page.goto("/quiz/");
  await page.addStyleTag({ content: `
    div.body h2 { color: red; font-size: 48px; padding: 30px; }
    div.body button { background-color: red; padding: 30px; }
    div.body span { font-weight: 400; }
    div.body summary { color: red; padding: 30px; }
  ` });
  const quiz = page.locator(".yaq-root").first();
  await expect(quiz.locator(".yaq-head")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(quiz.locator(".yaq-head")).toHaveCSS("padding", "5px 10px");
  await expect(quiz.getByRole("button", { name: "Corriger" })).toHaveCSS("background-color", "rgb(56, 109, 153)");
  await expect(quiz.getByRole("button", { name: "Corriger" })).toHaveCSS("padding", "5px 10px");
  await expect(page.locator(".yaq-spoiler-block-title").first()).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.locator(".yaq-spoiler-block-title").first()).toHaveCSS("padding", "5px 10px");
});

test("quiz and spoilers work by keyboard with named controls and announced feedback", async ({ page }) => {
  await page.goto("/quiz/");
  const quiz = page.locator(".yaq-root").first();
  const answer = quiz.getByRole("textbox").first();
  const truth = quiz.getByRole("group", { name: /Question .*URSS/ });
  const trueButton = truth.getByRole("button", { name: "True" });
  const falseButton = truth.getByRole("button", { name: "False" });
  const grade = quiz.getByRole("button", { name: "Corriger" });
  const reveal = quiz.getByRole("button", { name: "Montrer la solution" });
  const restart = quiz.getByRole("button", { name: "Recommencer" });
  const status = quiz.getByRole("status");

  await expect(answer).toHaveAccessibleName(/Question 1.*Yalta/);
  await expect(quiz.getByRole("combobox")).toHaveAccessibleName(/Question .*conférence/);
  await expect(trueButton).toHaveAttribute("aria-pressed", "false");
  await checkQuizAxe(page);

  await answer.focus();
  await page.keyboard.type("Yalta");
  await trueButton.focus();
  await page.keyboard.press("Tab");
  await expect(truth.getByRole("button", { name: "Unanswered" })).toBeFocused();
  await falseButton.focus();
  await page.keyboard.press("Space");
  await expect(falseButton).toHaveAttribute("aria-pressed", "true");
  await grade.focus();
  await page.keyboard.press("Enter");
  await expect(status).toContainText("Grading complete:");
  await expect(quiz.locator('[data-role="correctMarker"]:visible').first()).toContainText("Correct");
  await expect(quiz.locator('[data-role="wrongMarker"]:visible').first()).toContainText("Incorrect");
  await expect(quiz.locator('[data-role="unansweredMarker"]:visible')).toHaveCount(0);
  await expect(quiz.getByRole("textbox").nth(1)).toHaveClass(/yaq-blink/);
  await expectIconFeedback(quiz.locator('[data-role="correctMarker"]:visible').first(), "Correct");
  await expectIconFeedback(quiz.locator('[data-role="wrongMarker"]:visible').first(), "Incorrect");
  await checkQuizAxe(page);

  await expect(falseButton).toBeDisabled();
  await expect(trueButton).toBeDisabled();
  await expect(status).toContainText("1 incorrect");
  await page.reload();
  await expect(falseButton).toHaveAttribute("aria-pressed", "true");
  await expect(falseButton).toBeDisabled();
  await expect(trueButton).toBeDisabled();
  await expect(quiz.locator('[data-role="wrongMarker"]:visible')).toHaveCount(1);

  const remaining = quiz.getByRole("textbox");
  for (let index = 1; index < await remaining.count(); index++) {
    await remaining.nth(index).fill("wrong");
  }
  await quiz.getByRole("combobox").selectOption({ index: 1 });
  await grade.focus();
  await page.keyboard.press("Enter");
  await expect(reveal).toBeVisible();

  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(status).toContainText("Solutions shown:");
  await expect(quiz.locator('[data-role="solutionMarker"]:visible').first()).toContainText("Solution shown");
  await expectIconFeedback(quiz.locator('[data-role="solutionMarker"]:visible').first(), "Solution shown");
  await expect(falseButton).toHaveAttribute("aria-pressed", "true");
  await expect(trueButton).toBeDisabled();
  await restart.focus();
  await page.keyboard.press("Enter");
  await expect(status).toContainText("Quiz restarted:");
  await expect(answer).toHaveValue("");
  await expect(trueButton).toBeEnabled();
  await checkQuizAxe(page);

  const spoiler = page.locator(".yaq-spoiler-inline").first();
  await expect(spoiler).toHaveAccessibleName("Show hidden text");
  await spoiler.focus();
  await page.keyboard.press("Enter");
  await expect(spoiler).not.toHaveClass(/yaq-spoiler-inline-hidden/);
  await expect(spoiler).toBeDisabled();
  const disclosure = page.getByText("Indice", { exact: true }).first();
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(disclosure.locator("..")).toHaveAttribute("open", "");
});

test("correcting unanswered questions only blinks their controls", async ({ page }) => {
  await page.goto("/quiz/");
  const quiz = page.locator(".yaq-root").first();
  for (let attempt = 0; attempt < 2; attempt++) {
    await quiz.getByRole("button", { name: "Corriger" }).click();
    await expect(quiz.locator('[data-role="unansweredMarker"]:visible')).toHaveCount(0);
    for (const selector of ["input", "select", ".yaq-switch3"]) {
      const controls = quiz.locator(selector);
      expect(await controls.count()).toBeGreaterThan(0);
      for (const control of await controls.all()) {
        await expect(control).toHaveClass(/yaq-blink/);
      }
    }
    await expect(quiz.getByRole("status")).toContainText("unanswered");
  }
});

test("quiz controls reflow at narrow width and browser zoom", async ({ page }) => {
  await page.route(/\.(png|svg)(\?|$)/, (route) => route.abort());
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/quiz/");
  const quiz = page.locator(".yaq-root").first();
  await expect(quiz).toBeVisible();
  const dimensions = await quiz.evaluate((node) => ({ width: node.getBoundingClientRect().width, viewport: innerWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
  await page.evaluate(() => { document.body.style.zoom = "200%"; });
  await expect(quiz.getByRole("button", { name: "Corriger" })).toBeVisible();
  const focused = quiz.getByRole("textbox").first();
  await focused.focus();
  await expect(focused).toHaveCSS("outline-style", "solid");
});
