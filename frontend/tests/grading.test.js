import { describe, expect, it, vi } from "vitest";

import {
  MathVariableError,
  compareMathExpressions,
  floatEqual,
  testAnswer,
} from "../src/grading.js";

describe("testAnswer", () => {
  it.each([
    ["exact text", "Yalta", "Yalta", {}, true],
    ["different text", "Yalta", "yalta", {}, false],
    ["legacy numeric coercion", "01", "1", {}, true],
    ["no-space", "New York", "N e w\tY o r k", { noSpace: true }, true],
    ["regex", "^a+b*c$", "aaabbbc", { regex: true }, true],
    ["unordered sequence", "red green blue", "blue red green", { sequence: true }, true],
    ["ordered sequence", "1,2,3", "1; 2 3", { sequence: true, ordered: true }, true],
    ["ordered mismatch", "1,2,3", "3 2 1", { sequence: true, ordered: true }, false],
    ["sequence duplicate", "red red", "red blue", { sequence: true }, false],
  ])("preserves %s comparison", (_label, correct, given, options, expected) => {
    expect(testAnswer(correct, given, options)).toBe(expected);
  });

  it("delegates fuzzy comparison without changing its threshold semantics", () => {
    const fuzzyEqual = vi.fn(() => true);

    expect(testAnswer("réponse", "reponse", { fuzzy: true, fuzzyEqual })).toBe(true);
    expect(fuzzyEqual).toHaveBeenCalledWith("réponse", "reponse");
  });

  it("keeps the documented regexp spelling inert", () => {
    expect(testAnswer("^a+b*c$", "aaabbbc", { regexp: true })).toBe(false);
  });

  it("uses the legacy default fuzzy comparator when none is injected", () => {
    expect(testAnswer("réponse", "reponse", { fuzzy: true })).toBe(false);
  });

  it("compares compiled mathematical answers through injected dependencies", () => {
    const compileMath = vi.fn((source) => ({
      evaluate: ({ n }) => (source === "n^2" ? n ** 2 : n * n),
    }));

    expect(
      testAnswer("n^2", "n*n", {
        math: true,
        mathVariables: { n: [-2, 2] },
        mathTries: 2,
        compileMath,
        random: () => 0.25,
      }),
    ).toBe(true);
    expect(compileMath).toHaveBeenCalledTimes(2);
  });

  it("preserves failure after reporting an invalid authored math answer", () => {
    const compileMath = vi.fn((source) => {
      if (source === "invalid") {
        throw new SyntaxError("bad authored expression");
      }
      return { evaluate: () => 1 };
    });

    expect(() =>
      testAnswer("invalid", "1", {
        math: true,
        compileMath,
        mathTries: 1,
      }),
    ).toThrow(TypeError);
  });
});

describe("sampled mathematical comparison", () => {
  const expression = (evaluate) => ({ evaluate });

  it("uses the injected random source for each variable and trial", () => {
    const random = vi.fn(() => 0.25);
    const left = expression(({ n }) => n * n);
    const right = expression(({ n }) => n ** 2);

    expect(compareMathExpressions(left, right, { n: [-10, 10] }, 3, random)).toBe(true);
    expect(random).toHaveBeenCalledTimes(3);
  });

  it("returns false on the first sampled mismatch", () => {
    const random = vi.fn(() => 0.5);
    const left = expression(() => 1);
    const right = expression(() => 2);

    expect(compareMathExpressions(left, right, {}, 50, random)).toBe(false);
    expect(random).not.toHaveBeenCalled();
  });

  it("preserves the legacy non-number error", () => {
    const left = expression(() => "1");
    const right = expression(() => 1);

    expect(() => compareMathExpressions(left, right, {}, 1, () => 0.5)).toThrow(
      MathVariableError,
    );
  });

  it.each([
    [1, 1, true],
    [1, 1 + 1e-9, true],
    [1e9, 1e9 + 5, true],
    [1, 1.1, false],
  ])("compares %s and %s with the legacy tolerance", (first, second, expected) => {
    expect(floatEqual(first, second)).toBe(expected);
  });
});
