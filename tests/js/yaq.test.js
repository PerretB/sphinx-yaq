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
  it("uses compact Unicode feedback symbols with accessible text", async () => {
    const { document } = await loadQuestions([{ type: "FB", answer: "Yalta" }]);
    for (const [role, symbol, label] of [
      ["wrongMarker", "✘", "Incorrect"],
      ["correctMarker", "✔", "Correct"],
      ["solutionMarker", "ⓘ", "Solution shown"],
    ]) {
      const marker = document.querySelector(`[data-role="${role}"]`);
      expect(marker.title).toBe(label);
      expect(marker.querySelector('[aria-hidden="true"]').textContent).toBe(symbol);
      expect(marker.querySelector(".yaq-feedback-text").textContent.trim()).toBe(label);
      expect(marker.querySelector(".yaq-feedback-text").classList.contains("yaq-visually-hidden")).toBe(true);
    }
    expect(document.querySelector('[data-role="unansweredMarker"]')).toBeNull();
  });

  it("replaces placeholders with a titled quiz and the three footer actions", async () => {
    const { document, jsdomErrors } = await loadQuestions([
      { type: "FB", answer: "Yalta" },
    ]);

    expect(document.querySelector(".yaq-root")).not.toBeNull();
    expect(document.querySelector(".yaq-head").textContent).toContain(
      "Exercise 1 : Fixture quiz",
    );
    expect(document.querySelector(".yaq-FBQuestion input")).not.toBeNull();
    expect(button(document, "Check answers")).not.toBeNull();
    expect(button(document, "Show solution")).not.toBeNull();
    expect(button(document, "Restart")).not.toBeNull();
    expect(jsdomErrors).toEqual([]);
  });

  it("renders titles and choice labels as text", async () => {
    const escaped = "<script>alert(1)</script>";
    const { document, jsdomErrors } = await loadQuestions(
      [{ type: "SC", values: `safe,${escaped}`, answer: "safe" }],
      { title: escaped },
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

  it("preserves title apostrophes, quotes, ampersands, and literal entities", async () => {
    const title = "Hiérarchie d'héritage \"quoted\" & <tag> &amp;";
    const { document } = await loadQuestions(
      [{ type: "TF", answer: "T" }],
      { title },
    );
    expect(document.querySelector(".yaq-head").textContent).toBe(`Exercise 1 : ${title}`);
    expect(document.querySelector(".yaq-head tag")).toBeNull();
  });

  it("grades an exact fill-in answer and enables restart", async () => {
    const { document, window } = await loadQuestions([
      { type: "FB", answer: "Yalta" },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    input.value = "Yalta";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    await click(button(document, "Check answers"));

    expect(input.disabled).toBe(true);
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Restart"))).toBe(true);
  });

  it("keeps a wrong fill-in answer editable and can reveal the solution", async () => {
    const { document, window } = await loadQuestions([
      { type: "FB", answer: "1945", "displayed-answer": "1945" },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    input.value = "1944";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    await click(button(document, "Check answers"));

    expect(input.disabled).toBe(false);
    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Show solution"))).toBe(true);

    await click(button(document, "Show solution"));

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
    await click(button(document, "Check answers"));

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
    await click(button(document, "Check answers"));

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
    await click(button(document, "Check answers"));

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
    await click(button(document, "Check answers"));

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
    await click(button(document, "Check answers"));

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
    await click(button(document, "Check answers"));

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
    await click(button(document, "Check answers"));

    const warnings = [...document.querySelectorAll('[data-role="warningMarker"]')];
    expect(warnings.every((warning) => !warning.classList.contains("yaq-hidden"))).toBe(true);
    expect(warnings[0].title).toContain("syntax error");
    // Known defect: an undeclared symbol falls through to the generic error text.
    expect(warnings[1].title).toContain("unknown error");
    expect(warnings[1].title).toContain("m");
    expect(inputs.every((input) => !input.disabled)).toBe(true);
  });

  it("leaves an empty fill-in answer unanswered", async () => {
    const { document } = await loadQuestions([
      { type: "FB", answer: "anything" },
    ]);
    const input = document.querySelector(".yaq-FBQuestion input");

    await click(button(document, "Check answers"));

    expect(input.disabled).toBe(false);
    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).toContain("yaq-hidden");
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Restart"))).toBe(false);
  });

  it("grades a single-choice question and resets its selection", async () => {
    const { document, window } = await loadQuestions([
      { type: "SC", values: "Paris,Potsdam,San Francisco", answer: "Potsdam" },
    ]);
    const select = document.querySelector("select");

    select.value = "Potsdam";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
    await click(button(document, "Check answers"));

    expect(select.disabled).toBe(true);
    await click(button(document, "Restart"));
    expect(select.disabled).toBe(false);
    expect(select.value).toBe("");
  });

  it("resets a correct fill-in answer", async () => {
    const { document } = await loadQuestions([{ type: "FB", answer: "yes" }]);
    const input = document.querySelector("input");

    await enter(input, "yes");
    await click(button(document, "Check answers"));
    await click(button(document, "Restart"));

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
    await click(button(document, "Check answers"));
    expect(isDisplayed(button(document, "Restart"))).toBe(false);
    await click(button(document, "Restart"));

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
    await click(button(document, "Check answers"));
    await click(button(document, "Show solution"));
    expect(input.value).toBe("shown answer");
    await click(button(document, "Restart"));

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
    await click(button(document, "Check answers"));
    await enter(input, "yes");
    await click(button(document, "Check answers"));

    expect(input.disabled).toBe(true);
    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it("grades a correct true/false answer", async () => {
    const { document } = await loadQuestions([{ type: "TF", answer: "T" }]);

    await click(document.querySelector('[data-index="0"]'));
    await click(button(document, "Check answers"));

    expect(
      document.querySelector('[data-role="correctMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Restart"))).toBe(true);
  });

  it.each([["T", "2"], ["F", "0"]])("locks a wrong true/false answer (%s) until restart", async (answer, wrongIndex) => {
    const { document } = await loadQuestions([{ type: "TF", answer }]);

    await click(document.querySelector(`[data-index="${wrongIndex}"]`));
    await click(button(document, "Check answers"));

    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Show solution"))).toBe(false);
    expect(isDisplayed(button(document, "Check answers"))).toBe(false);
    expect(isDisplayed(button(document, "Restart"))).toBe(true);
    expect(document.querySelector('[role="status"]').textContent).toContain("1 incorrect, 0 unanswered, 0 solutions shown");
    for (const control of document.querySelectorAll('[data-index]')) expect(control.disabled).toBe(true);

    await click(document.querySelector(`[data-index="${wrongIndex === "0" ? "2" : "0"}"]`));
    expect(document.querySelector(`[data-index="${wrongIndex}"]`).getAttribute("aria-pressed")).toBe("true");

    await click(button(document, "Restart"));
    expect(document.querySelector('[data-index="1"]').getAttribute("aria-pressed")).toBe("true");
    for (const control of document.querySelectorAll('[data-index]')) expect(control.disabled).toBe(false);
  });

  it("preserves a terminal wrong true/false answer when solutions are requested", async () => {
    const { document } = await loadQuestions([{ type: "TF", answer: "T" }]);

    await click(document.querySelector('[data-index="2"]'));
    await click(button(document, "Check answers"));
    await click(button(document, "Show solution"));

    expect(document.querySelector('[data-index="2"]').classList).toContain(
      "yaq-switch3-button-active",
    );
    expect(document.querySelector('[data-index="0"]').disabled).toBe(true);
    expect(
      document.querySelector('[data-role="wrongMarker"]').classList,
    ).not.toContain("yaq-hidden");
  });

  it.each([false, true])("restores a terminal wrong TF answer (previous retry policy: %s)", async (oldPolicy) => {
    const markup = quizMarkup({ questions: [{ type: "TF", answer: "T" }] });
    harness = await loadRuntime(markup);
    await click(harness.document.querySelector('[data-index="2"]'));
    await click(button(harness.document, "Check answers"));
    harness.window.yaq_app.storage.flush();
    const key = harness.window.localStorage.key(0);
    let saved = harness.window.localStorage.getItem(key);
    if (oldPolicy) saved = saved.replace('"enabled":false,"state":12', '"enabled":true,"state":4');
    harness.close();
    harness = await loadRuntime(markup, { storageEntries: [[key, saved]] });
    const { document } = harness;
    expect(document.querySelector('[data-index="2"]').getAttribute("aria-pressed")).toBe("true");
    for (const control of document.querySelectorAll('[data-index]')) expect(control.disabled).toBe(true);
    expect(document.querySelector('[data-role="wrongMarker"]').classList).not.toContain("yaq-hidden");
    expect(isDisplayed(button(document, "Restart"))).toBe(true);
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
    await click(buttonWithin(roots[1], "Check answers"));
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
    await click(button(document, "Check answers"));

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
    await click(button(document, "Check answers"));
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
    await click(buttonWithin(roots[0], "Check answers"));
    await enter(roots[1].querySelector("input"), "no");
    await click(buttonWithin(roots[1], "Check answers"));
    await enter(roots[2].querySelector("input"), "no");
    await click(buttonWithin(roots[2], "Check answers"));
    await click(buttonWithin(roots[2], "Show solution"));
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
    await click(button(document, "Check answers"));
    window.yaq_app.storage.flush();
    expect(window.localStorage.length).toBe(1);

    await click(button(document, "Restart"));

    expect(window.localStorage.length).toBe(0);
  });
});
