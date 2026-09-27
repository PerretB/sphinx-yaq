import { afterEach, expect, it } from "vitest";
import french from "../../src/sphinx_yaq/locales/fr.json";
import { button, loadRuntime, quizMarkup } from "./yaq-harness.js";

let harness;
afterEach(() => harness?.close());

it("isolates languages on one page, including controls, feedback and announcements", async () => {
  const questions = [{ type: "TF", answer: "T" }];
  harness = await loadRuntime(
    quizMarkup({ uid: "fr", questions, i18n: { language: "fr", messages: french } })
    + quizMarkup({ uid: "en", questions }),
  );
  const [fr, en] = harness.document.querySelectorAll(".yaq-root");
  expect(fr.querySelector(".yaq-head").textContent).toContain("Exercice 1");
  expect(en.querySelector(".yaq-head").textContent).toContain("Exercise 2");
  expect(fr.querySelector('[aria-label="Vrai"]').textContent).toBe("V");
  expect(en.querySelector('[aria-label="True"]').textContent).toBe("T");
  expect(fr.querySelector('[data-role="solutionMarker"]').title).toBe("Solution affichée");
  expect(fr.querySelector(".yaq-footer").lang).toBe("fr");
  expect(fr.querySelector(".yaq-activity").hasAttribute("lang")).toBe(false);
  fr.querySelector('[aria-label="Vrai"]').click();
  button(fr, "Vérifier les réponses").click();
  button(en, "Check answers").click();
  expect(fr.querySelector('[role="status"]').textContent).toContain("Vérification terminée : 1 réponse correcte");
  expect(en.querySelector('[role="status"]').textContent).toContain("1 unanswered");
  expect(harness.jsdomErrors).toEqual([]);
});

it("treats translated messages as text and localizes question failure messages", async () => {
  harness = await loadRuntime(quizMarkup({
    questions: [{ type: "INVALID" }],
    i18n: { language: "fr", messages: { ...french, check_answers: "<img src=x onerror=alert(1)>" } },
  }));
  expect(harness.document.querySelector("img")).toBeNull();
  expect(harness.document.querySelector(".yaq-question-fallback").textContent)
    .toContain("Question interactive indisponible.");
  expect(harness.document.querySelector(".yaq-button").textContent).toContain("<img");
});
