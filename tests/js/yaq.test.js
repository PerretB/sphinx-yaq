import { afterEach, describe, expect, it } from "vitest";

import {
  button,
  isDisplayed,
  loadRuntime,
  quizMarkup,
  settle,
} from "./yaq-harness.js";

let harness;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

async function loadQuestions(questions, options = {}) {
  harness = await loadRuntime(quizMarkup({ ...options, questions }));
  return harness;
}

async function click(element) {
  element.click();
  await settle(harness.window);
}

async function enter(input, value) {
  input.value = value;
  input.dispatchEvent(new harness.window.Event("input", { bubbles: true }));
  await settle(harness.window);
}

function buttonWithin(element, label) {
  const match = [...element.querySelectorAll(".yaq-footer .yaq-button")].find(
    (candidate) => candidate.textContent.trim() === label,
  );
  if (!match) {
    throw new Error(`Button not found: ${label}`);
  }
  return match;
}

describe("YAQ runtime characterization", () => {
  it("replaces placeholders with a titled quiz and the three footer actions", async () => {
    const { document, jsdomErrors } = await loadQuestions([
      { type: "FB", answer: "Yalta" },
    ]);

    expect(document.querySelector(".yaq-root")).not.toBeNull();
    expect(document.querySelector(".yaq-head").textContent).toContain(
      "Exercice 1 : Fixture quiz",
    );
    expect(document.querySelector(".yaq-FBQuestion input")).not.toBeNull();
    expect(button(document, "Corriger")).not.toBeNull();
    expect(button(document, "Montrer la solution")).not.toBeNull();
    expect(button(document, "Recommencer")).not.toBeNull();
    expect(jsdomErrors).toEqual([]);
  });

  it("renders Python-escaped titles and choice labels as text", async () => {
    const escaped = "&lt;script&gt;alert(1)&lt;/script&gt;";
    const { document, jsdomErrors } = await loadQuestions(
      [{ type: "SC", values: `safe,${escaped}`, answer: "safe" }],
      // The HTML translator escapes the ampersands once more in the data
      // attribute; the browser removes that outer layer before JSON parsing.
      { title: escaped.replaceAll("&", "&amp;") },
    );

    expect(document.querySelector(".yaq-head").textContent).toContain(
      "<script>alert(1)</script>",
    );
    expect(
      [...document.querySelectorAll(".yaq-FBQuestion option")].map(
        (option) => option.textContent,
      ),
    ).toContain("<script>alert(1)</script>");
    expect(document.querySelector("script")).toBeNull();
    expect(jsdomErrors).toEqual([]);
  });

  it("grades an exact fill-in answer and enables restart", async () => {
    const { document, window } = await loadQuestions([
      { type: "FB", answer: "Yalta" },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    input.value = "Yalta";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    await click(button(document, "Corriger"));

    expect(input.disabled).toBe(true);
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Recommencer"))).toBe(true);
  });

  it("keeps a wrong fill-in answer editable and can reveal the solution", async () => {
    const { document, window } = await loadQuestions([
      { type: "FB", answer: "1945", "displayed-answer": "1945" },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    input.value = "1944";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    await click(button(document, "Corriger"));

    expect(input.disabled).toBe(false);
    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Montrer la solution"))).toBe(true);

    await click(button(document, "Montrer la solution"));

    expect(input.value).toBe("1945");
    expect(input.disabled).toBe(true);
    expect(
      document.querySelector('[data-role="solutionMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("accepts fuzzy and unordered sequence answers", async () => {
    const { document, window } = await loadQuestions([
      { type: "FB", answer: "réponse", flags: "fuzzy" },
      {
        type: "FB",
        answer: "rouge vert bleu",
        flags: "sequence,fuzzy",
      },
    ]);
    const inputs = [...document.querySelectorAll(".yaq-FBQuestion input")];

    inputs[0].value = "reponse";
    inputs[0].dispatchEvent(new window.Event("input", { bubbles: true }));
    inputs[1].value = "bleu rouges vert";
    inputs[1].dispatchEvent(new window.Event("input", { bubbles: true }));
    await click(button(document, "Corriger"));

    expect(inputs.every((input) => input.disabled)).toBe(true);
    expect(
      [...document.querySelectorAll('[data-role="correctMarker"]')].every(
        (marker) => !marker.classList.contains("yaq-hidden"),
      ),
    ).toBe(true);
  });

  it("supports nospace matching", async () => {
    const { document } = await loadQuestions([
      { type: "FB", answer: "New York", flags: "nospace" },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    await enter(input, "N e w\tY o r k");
    await click(button(document, "Corriger"));

    expect(input.disabled).toBe(true);
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("requires sequence order when the ordered flag is present", async () => {
    const { document } = await loadQuestions([
      { type: "FB", answer: "1,2,3", flags: "sequence,ordered" },
      { type: "FB", answer: "1,2,3", flags: "sequence,ordered" },
    ]);
    const inputs = [...document.querySelectorAll(".yaq-FBQuestion input")];

    await enter(inputs[0], "1; 2 3");
    await enter(inputs[1], "3 2 1");
    await click(button(document, "Corriger"));

    const questions = [...document.querySelectorAll(".yaq-Question")];
    expect(
      questions[0].querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(
      questions[1].querySelector('[data-role="wrongMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("matches answers with the implemented regex flag", async () => {
    const { document } = await loadQuestions([
      {
        type: "FB",
        answer: "^a+b*c$",
        flags: "regex",
        "displayed-answer": "ac (par exemple)",
      },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    await enter(input, "aaabbbc");
    await click(button(document, "Corriger"));

    expect(input.disabled).toBe(true);
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("characterizes the documented regexp spelling as an ignored flag", async () => {
    const { document } = await loadQuestions([
      { type: "FB", answer: "^a+b*c$", flags: "regexp" },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    await enter(input, "aaabbbc");
    await click(button(document, "Corriger"));

    // Known defect: the prose documents `regexp`, but the runtime checks `regex`.
    expect(input.disabled).toBe(false);
    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("checks equivalent mathematical expressions with declared variables", async () => {
    const { document, window } = await loadQuestions([
      {
        type: "FB",
        answer: "n^2 + 3",
        flags: "math",
        vars: { n: [-10, 10] },
      },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    input.value = "n*n + 3";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    await click(button(document, "Corriger"));

    expect(input.disabled).toBe(true);
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("reports invalid mathematical syntax and unknown variables without ending the quiz", async () => {
    const { document } = await loadQuestions([
      {
        type: "FB",
        answer: "n^2 + 3",
        flags: "math",
        vars: { n: [-10, 10] },
      },
      {
        type: "FB",
        answer: "n^2 + 3",
        flags: "math",
        vars: { n: [-10, 10] },
      },
    ]);
    const inputs = [...document.querySelectorAll(".yaq-FBQuestion input")];

    await enter(inputs[0], "n +");
    await enter(inputs[1], "m^2 + 3");
    await click(button(document, "Corriger"));

    const warnings = [...document.querySelectorAll('[data-role="warningMarker"]')];
    expect(warnings.every((warning) => !warning.classList.contains("yaq-hidden"))).toBe(true);
    expect(warnings[0].title).toContain("erreur de syntaxe");
    // Known defect: an undeclared symbol falls through to the generic error text.
    expect(warnings[1].title).toContain("erreur inconnue");
    expect(warnings[1].title).toContain("m");
    expect(inputs.every((input) => !input.disabled)).toBe(true);
  });

  it("leaves an empty fill-in answer unanswered", async () => {
    const { document } = await loadQuestions([
      { type: "FB", answer: "anything" },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    await click(button(document, "Corriger"));

    expect(input.disabled).toBe(false);
    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).toContain("yaq-hidden");
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Recommencer"))).toBe(false);
  });

  it("grades a single-choice question and resets its selection", async () => {
    const { document, window } = await loadQuestions([
      { type: "SC", values: "Paris,Potsdam,San Francisco", answer: "Potsdam" },
    ]);
    const select = document.querySelector("select");

    select.value = "Potsdam";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
    await click(button(document, "Corriger"));

    expect(select.disabled).toBe(true);
    await click(button(document, "Recommencer"));
    expect(select.disabled).toBe(false);
    expect(select.value).toBe("");
  });

  it("resets a correct fill-in answer", async () => {
    const { document } = await loadQuestions([{ type: "FB", answer: "yes" }]);
    const input = document.querySelector("input");

    await enter(input, "yes");
    await click(button(document, "Corriger"));
    await click(button(document, "Recommencer"));

    expect(input.value).toBe("");
    expect(input.disabled).toBe(false);
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).toContain("yaq-hidden");
  });

  it("clears a wrong fill-in state when the hidden reset action is invoked", async () => {
    const { document } = await loadQuestions([{ type: "FB", answer: "yes" }]);
    const input = document.querySelector("input");

    await enter(input, "no");
    await click(button(document, "Corriger"));
    expect(isDisplayed(button(document, "Recommencer"))).toBe(false);
    await click(button(document, "Recommencer"));

    expect(input.value).toBe("");
    expect(input.disabled).toBe(false);
    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).toContain("yaq-hidden");
  });

  it("resets a revealed fill-in answer", async () => {
    const { document } = await loadQuestions([
      { type: "FB", answer: "machine", "displayed-answer": "shown answer" },
    ]);
    const input = document.querySelector("input");

    await enter(input, "wrong");
    await click(button(document, "Corriger"));
    await click(button(document, "Montrer la solution"));
    expect(input.value).toBe("shown answer");
    await click(button(document, "Recommencer"));

    expect(input.value).toBe("");
    expect(input.disabled).toBe(false);
    expect(
      document.querySelector('[data-role="solutionMarker"]').classList,
    ).toContain("yaq-hidden");
  });

  it("allows a wrong fill-in answer to be corrected and retried", async () => {
    const { document } = await loadQuestions([{ type: "FB", answer: "yes" }]);
    const input = document.querySelector("input");

    await enter(input, "no");
    await click(button(document, "Corriger"));
    await enter(input, "yes");
    await click(button(document, "Corriger"));

    expect(input.disabled).toBe(true);
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("grades a correct true/false answer", async () => {
    const { document } = await loadQuestions([{ type: "TF", answer: "T" }]);

    await click(document.querySelector('[data-index="0"]'));
    await click(button(document, "Corriger"));

    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Recommencer"))).toBe(true);
  });

  it("keeps a wrong true/false answer retryable", async () => {
    const { document } = await loadQuestions([{ type: "TF", answer: "T" }]);

    await click(document.querySelector('[data-index="2"]'));
    await click(button(document, "Corriger"));

    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Montrer la solution"))).toBe(true);
    expect(isDisplayed(button(document, "Recommencer"))).toBe(false);

    await click(document.querySelector('[data-index="0"]'));
    await click(button(document, "Corriger"));

    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(document.querySelector('[data-index="0"]').classList).toContain(
      "yaq-switch3-button-disabled",
    );
  });

  it("reveals the true/false solution in the actual control and disables it", async () => {
    const { document } = await loadQuestions([{ type: "TF", answer: "T" }]);

    await click(document.querySelector('[data-index="2"]'));
    await click(button(document, "Corriger"));
    await click(button(document, "Montrer la solution"));

    expect(document.querySelector('[data-index="0"]').classList).toContain(
      "yaq-switch3-button-active",
    );
    expect(document.querySelector('[data-index="0"]').classList).toContain(
      "yaq-switch3-button-disabled",
    );
    expect(
      document.querySelector('[data-role="solutionMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("rejects duplicate runtime quiz identifiers without damaging prose", async () => {
    const markup = [
      quizMarkup({ uid: "duplicate", title: "First", questions: [{ type: "TF", answer: "T" }] }),
      quizMarkup({ uid: "duplicate", title: "Second", questions: [{ type: "TF", answer: "F" }] }),
    ].join("");

    harness = await loadRuntime(markup);

    expect(harness.document.querySelectorAll(".yaq-root")).toHaveLength(1);
    expect(harness.document.body.textContent).toContain("Question 1");
    expect(harness.document.body.textContent).toContain("Interactive quiz unavailable.");
  });

  it("initializes multiple independent quizzes containing all question types", async () => {
    const markup = [
      quizMarkup({
        uid: "first",
        title: "Mixed",
        questions: [
          { type: "FB", answer: "text" },
          { type: "SC", values: "A,B", answer: "B" },
          { type: "TF", answer: "T" },
        ],
      }),
      quizMarkup({
        uid: "second",
        title: "Separate",
        questions: [{ type: "FB", answer: "other" }],
      }),
    ].join("");
    harness = await loadRuntime(markup);
    const roots = [...harness.document.querySelectorAll(".yaq-root")];

    expect(roots).toHaveLength(2);
    expect(roots[0].querySelectorAll(".yaq-Question")).toHaveLength(3);
    expect(roots[1].querySelectorAll(".yaq-Question")).toHaveLength(1);

    const secondInput = roots[1].querySelector("input");
    await enter(secondInput, "other");
    await click(buttonWithin(roots[1], "Corriger"));
    expect(secondInput.disabled).toBe(true);
    expect(roots[0].querySelector("input").disabled).toBe(false);
  });

  it("preserves Unicode and punctuation in fill-in answers", async () => {
    const answers = [
      "café 東京",
      'He said "yes"',
      String.raw`C:\temp\file`,
      "fish & chips",
      "<tag>",
    ];
    const { document } = await loadQuestions(
      answers.map((answer) => ({ type: "FB", answer })),
    );
    const inputs = [...document.querySelectorAll("input")];

    for (const [index, answer] of answers.entries()) {
      await enter(inputs[index], answer);
    }
    await click(button(document, "Corriger"));

    expect(inputs.every((input) => input.disabled)).toBe(true);
    expect(inputs.map((input) => input.value)).toEqual(answers);
  });

  it("keeps readable content and continues after one quiz has an invalid top-level model", async () => {
    const markup = [
      '<div class="yaq" data-model="not-json"><p>Readable fallback text</p></div>',
      quizMarkup({
        uid: "healthy",
        title: "Healthy quiz",
        questions: [{ type: "TF", answer: "T" }],
      }),
    ].join("");

    harness = await loadRuntime(markup);

    expect(harness.document.body.textContent).toContain("Readable fallback text");
    expect(harness.document.body.textContent).toContain("Interactive quiz unavailable.");
    expect(harness.document.querySelectorAll(".yaq-root")).toHaveLength(1);
    expect(harness.document.querySelector(".yaq-head").textContent).toContain(
      "Healthy quiz",
    );
  });

  it("contains a broken question while activating valid questions in the same quiz", async () => {
    const { document } = await loadQuestions([
      { type: "unknown", answer: "x" },
      { type: "FB", answer: "works" },
    ]);

    expect(document.body.textContent).toContain("Interactive question unavailable.");
    expect(document.querySelectorAll(".yaq-Question")).toHaveLength(1);
    const input = document.querySelector("input");
    await enter(input, "works");
    await click(button(document, "Corriger"));
    expect(input.disabled).toBe(true);
  });

  it("does not create accidental global bindings", async () => {
    const { window } = await loadQuestions([{ type: "FB", answer: "yes" }]);
    expect(window.model).toBeUndefined();
    expect(window.q).toBeUndefined();
    expect(window.e).toBeUndefined();
    expect(window.innerHTML).toBeUndefined();
  });

  it("restores correct, wrong, revealed, and unanswered progress", async () => {
    const markup = [
      quizMarkup({ uid: "correct", questions: [{ type: "FB", answer: "yes" }] }),
      quizMarkup({ uid: "wrong", questions: [{ type: "FB", answer: "yes" }] }),
      quizMarkup({ uid: "revealed", questions: [{ type: "FB", answer: "yes" }] }),
      quizMarkup({ uid: "unanswered", questions: [{ type: "FB", answer: "yes" }] }),
    ].join("");
    harness = await loadRuntime(markup);
    let roots = [...harness.document.querySelectorAll(".yaq-root")];

    await enter(roots[0].querySelector("input"), "yes");
    await click(buttonWithin(roots[0], "Corriger"));
    await enter(roots[1].querySelector("input"), "no");
    await click(buttonWithin(roots[1], "Corriger"));
    await enter(roots[2].querySelector("input"), "no");
    await click(buttonWithin(roots[2], "Corriger"));
    await click(buttonWithin(roots[2], "Montrer la solution"));
    await enter(roots[3].querySelector("input"), "draft");
    harness.window.yaq_app.storage.flush();

    const storageEntries = [];
    for (let index = 0; index < harness.window.localStorage.length; index += 1) {
      const key = harness.window.localStorage.key(index);
      storageEntries.push([key, harness.window.localStorage.getItem(key)]);
    }
    harness.close();
    harness = await loadRuntime(markup, { storageEntries });
    roots = [...harness.document.querySelectorAll(".yaq-root")];

    expect(roots[0].querySelector("input").value).toBe("yes");
    expect(roots[0].querySelector("input").disabled).toBe(true);
    expect(roots[0].querySelector('[data-role="correctMarker"]').classList).not.toContain("yaq-hidden");
    expect(roots[1].querySelector("input").value).toBe("no");
    expect(roots[1].querySelector("input").disabled).toBe(false);
    expect(roots[1].querySelector('[data-role="wrongMarker"]').classList).not.toContain("yaq-hidden");
    expect(roots[2].querySelector("input").value).toBe("yes");
    expect(roots[2].querySelector("input").disabled).toBe(true);
    expect(roots[2].querySelector('[data-role="solutionMarker"]').classList).not.toContain("yaq-hidden");
    expect(roots[3].querySelector("input").value).toBe("draft");
    expect(roots[3].querySelector("input").disabled).toBe(false);
    expect(roots[3].querySelector('[data-role="wrongMarker"]').classList).toContain("yaq-hidden");
  });

  it("removes saved progress on restart", async () => {
    const { document, window } = await loadQuestions([{ type: "FB", answer: "yes" }]);
    await enter(document.querySelector("input"), "yes");
    await click(button(document, "Corriger"));
    window.yaq_app.storage.flush();
    expect(window.localStorage.length).toBe(1);

    await click(button(document, "Recommencer"));

    expect(window.localStorage.length).toBe(0);
  });
});
