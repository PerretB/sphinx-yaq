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
    ["decimal with leading zero", "01", "1", {}, true],
    ["no-space", "New York", "N e w\tY o r k", { noSpace: true }, true],
    ["regex", "^a+b*c$", "aaabbbc", { regex: true }, true],
    ["unordered sequence", "red green blue", "blue red green", { sequence: true }, true],
    ["ordered sequence", "1,2,3", "1; 2 3", { sequence: true, ordered: true }, true],
    ["ordered mismatch", "1,2,3", "3 2 1", { sequence: true, ordered: true }, false],
    ["sequence duplicate", "red red", "red blue", { sequence: true }, false],
  ])("preserves %s comparison", (_label, correct, given, options, expected) => {
    expect(testAnswer(correct, given, options)).toBe(expected);
  });

  it("passes the configured threshold to an injected fuzzy comparator", () => {
    const fuzzyEqual = vi.fn(() => true);

    expect(testAnswer("réponse", "reponse", { fuzzy: true, fuzzyThreshold: 0.9, fuzzyEqual })).toBe(true);
    expect(fuzzyEqual).toHaveBeenCalledWith("réponse", "reponse", 0.9);
  });

  it("keeps the documented regexp spelling inert", () => {
    expect(testAnswer("^a+b*c$", "aaabbbc", { regexp: true })).toBe(false);
  });

  it.each([
    ["canonical Unicode", "café", "cafe\u0301", {}, true],
    ["case matters", "Paris", "paris", {}, false],
    ["accent matters", "réponse", "reponse", {}, false],
    ["punctuation matters", "yes!", "yes", {}, false],
    ["outer spaces matter", "Paris", " Paris ", {}, false],
    ["interior spaces matter", "New York", "New  York", {}, false],
    ["numeric decimal exponent", "1e3", "1000", {}, true],
    ["numeric signs", "+1.0", "1", {}, true],
    ["numeric whitespace rejected", "1", " 1 ", {}, false],
    ["empty is not zero", "0", "", {}, false],
    ["hex is not decimal", "0x10", "16", {}, false],
    ["binary is not decimal", "0b10", "2", {}, false],
    ["infinity is not numeric", "Infinity", "1e999", {}, false],
    ["numeric prefix rejected", "1apple", "1", {}, false],
    ["large integers stay distinct", "9007199254740992", "9007199254740993", {}, false],
    ["small decimal magnitudes stay distinct", "1e-999", "2e-999", {}, false],
    ["noSpace removes all Unicode whitespace", "New York", "N\u00a0e w\nYork", { noSpace: true }, true],
    ["noSpace keeps punctuation", "New-York", "New York", { noSpace: true }, false],
    ["fuzzy accents and case", "réponse", "REPONSE", { fuzzy: true }, true],
    ["fuzzy documented typo", "réponse", "rponse", { fuzzy: true }, true],
    ["fuzzy punctuation retained", "abcd!", "abcd?", { fuzzy: true }, true],
    ["fuzzy punctuation can fail threshold", "abcd!", "abcd?", { fuzzy: true, fuzzyThreshold: 0.9 }, false],
    ["fuzzy threshold boundary", "abcde", "abcdx", { fuzzy: true }, true],
    ["fuzzy stricter threshold", "abcde", "abcdx", { fuzzy: true, fuzzyThreshold: 0.81 }, false],
    ["fuzzy different word", "Paris", "London", { fuzzy: true }, false],
    ["fuzzy whitespace collapsed", "New  York", "new york", { fuzzy: true }, true],
    ["fuzzy noSpace combined", "New York", "newyork", { fuzzy: true, noSpace: true }, true],
    ["unordered duplicate permutation", "red red blue", "blue red red", { sequence: true }, true],
    ["unordered duplicate count", "red red blue", "red blue blue", { sequence: true }, false],
    ["unordered length mismatch", "red green", "red green blue", { sequence: true }, false],
    ["ordered duplicate permutation", "red red blue", "red blue red", { sequence: true, ordered: true }, false],
    ["sequence repeated delimiters", "red,green;blue", " red;; green,,blue ", { sequence: true, ordered: true }, true],
    ["empty expected sequence", "", "", { sequence: true }, false],
    ["empty given sequence", "red", " , ; ", { sequence: true }, false],
    ["fuzzy sequence permutation", "rouge vert bleu", "bleu rouges vert", { sequence: true, fuzzy: true }, true],
    ["fuzzy sequence needs one-to-one matching", "longword longwords", "longwords longword", { sequence: true, fuzzy: true }, true],
  ])("uses documented 08A semantics for %s", (_label, correct, given, options, expected) => {
    for (let repeat = 0; repeat < 5; repeat += 1) {
      expect(testAnswer(correct, given, options)).toBe(expected);
    }
  });

  it.each([-0.01, 1.01, Number.NaN])("rejects invalid fuzzy threshold %s", (fuzzyThreshold) => {
    expect(() => testAnswer("a", "a", { fuzzy: true, fuzzyThreshold })).toThrow(RangeError);
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
