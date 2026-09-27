import { describe, expect, it } from "vitest";
import english from "../../src/sphinx_yaq/locales/en.json";
import french from "../../src/sphinx_yaq/locales/fr.json";
import { createTranslator, translatorFor } from "../src/i18n.js";

describe("message catalogs", () => {
  it("provides matching keys, plural forms, and placeholders", () => {
    expect(Object.keys(french).sort()).toEqual(Object.keys(english).sort());
    const placeholders = value => [...value.matchAll(/\{\w+\}/g)].map(m => m[0]).sort();
    for (const key of Object.keys(english)) {
      const en = typeof english[key] === "string" ? { text: english[key] } : english[key];
      const fr = typeof french[key] === "string" ? { text: french[key] } : french[key];
      expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
      for (const form of Object.keys(en)) {
        expect(fr[form].length).toBeGreaterThan(0);
        expect(placeholders(fr[form])).toEqual(placeholders(en[form]));
      }
    }
  });

  it("selects language-specific plurals and substitutes placeholders literally", () => {
    const en = createTranslator();
    const fr = createTranslator({ language: "fr", messages: french });
    expect(en("count_solution", { count: 0 })).toBe("0 solutions shown");
    expect(en("count_solution", { count: 1 })).toBe("1 solution shown");
    expect(fr("count_solution", { count: 0 })).toBe("0 solution affichée");
    expect(fr("count_solution", { count: 2 })).toBe("2 solutions affichées");
    expect(fr("exercise_heading", { number: 1, title: "<b>{number}$&</b>" }))
      .toBe("Exercice 1 : <b>{number}$&</b>");
  });

  it("falls back for missing messages and malformed payloads", () => {
    expect(createTranslator({ language: "fr" })("restart")).toBe("Restart");
    for (const payload of ["{", "null", '{"language":"invalid_locale"}']) {
      expect(translatorFor({ getAttribute: () => payload })("restart")).toBe("Restart");
    }
  });
});
