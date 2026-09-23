import { afterEach, describe, expect, test, vi } from "vitest";

import {
  fingerprintQuizDefinition,
  normalizeDocumentScope,
  QuizStorage,
  STORAGE_SCHEMA_VERSION,
  storageKey,
} from "../src/storage.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function adapter(storage, options = {}) {
  return new QuizStorage({
    globalObject: { localStorage: storage },
    documentScope: "/course//lesson/",
    ...options,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("QuizStorage", () => {
  test("normalizes document scope and produces versioned namespaced keys", () => {
    expect(normalizeDocumentScope("/course//lesson/")).toBe("/course/lesson");
    expect(storageKey("/course/lesson/", "quiz one")).toBe(
      "sphinx-yaq:v1:%2Fcourse%2Flesson:quiz%20one",
    );
  });

  test("round trips a schema-versioned state payload", () => {
    const storage = new MemoryStorage();
    const quizzes = adapter(storage);
    const state = { enabled: true, questions: [{ state: 2 }] };

    quizzes.save("quiz-1", "definition-a", state);
    expect(quizzes.flush("quiz-1")).toBe(true);
    expect(quizzes.load("quiz-1", "definition-a")).toEqual(state);

    expect(JSON.parse(storage.getItem(quizzes.key("quiz-1")))).toEqual({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      fingerprint: "definition-a",
      state,
    });
  });

  test("isolates records by normalized path and quiz ID", () => {
    const storage = new MemoryStorage();
    const firstPath = adapter(storage);
    const secondPath = new QuizStorage({
      globalObject: { localStorage: storage },
      documentScope: "/course/other.html",
    });

    firstPath.save("one", "fp", { value: 1 });
    firstPath.save("two", "fp", { value: 2 });
    secondPath.save("one", "fp", { value: 3 });
    firstPath.flush();
    secondPath.flush();

    expect(firstPath.load("one", "fp")).toEqual({ value: 1 });
    expect(firstPath.load("two", "fp")).toEqual({ value: 2 });
    expect(secondPath.load("one", "fp")).toEqual({ value: 3 });
  });

  test("debounces repeated saves for one quiz", () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const quizzes = adapter(storage);

    quizzes.save("quiz-1", "fp", { value: "first" });
    quizzes.save("quiz-1", "fp", { value: "latest" });
    vi.advanceTimersByTime(249);
    expect(setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(quizzes.load("quiz-1", "fp")).toEqual({ value: "latest" });
  });

  test.each([
    ["corrupt JSON", "{broken"],
    [
      "an unknown schema version",
      JSON.stringify({ schemaVersion: 99, fingerprint: "fp", state: { value: 1 } }),
    ],
    [
      "an incompatible fingerprint",
      JSON.stringify({ schemaVersion: 1, fingerprint: "old", state: { value: 1 } }),
    ],
  ])("ignores %s", (_label, serialized) => {
    const storage = new MemoryStorage();
    const quizzes = adapter(storage);
    storage.setItem(quizzes.key("quiz-1"), serialized);
    expect(quizzes.load("quiz-1", "fp")).toBeNull();
  });

  test("continues when the localStorage getter throws", () => {
    const globalObject = {};
    Object.defineProperty(globalObject, "localStorage", {
      get() {
        throw new Error("denied");
      },
    });
    const quizzes = new QuizStorage({ globalObject });

    expect(quizzes.available).toBe(false);
    expect(quizzes.load("quiz-1", "fp")).toBeNull();
    expect(() => quizzes.save("quiz-1", "fp", { value: 1 })).not.toThrow();
    expect(quizzes.flush()).toBe(false);
    expect(quizzes.remove("quiz-1")).toBe(false);
  });

  test("continues when reads or writes throw, including quota failure", () => {
    const storage = {
      get length() {
        throw new Error("denied");
      },
      getItem() {
        throw new Error("denied");
      },
      key() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    const quizzes = adapter(storage);

    expect(quizzes.load("quiz-1", "fp")).toBeNull();
    expect(() => {
      quizzes.save("quiz-1", "fp", { value: 1 });
      quizzes.flush();
    }).not.toThrow();
    expect(quizzes.available).toBe(false);
    expect(quizzes.remove("quiz-1")).toBe(false);
    expect(quizzes.clearAll()).toBe(false);
  });

  test("remove cancels a pending save and clearAll preserves unrelated data", () => {
    const storage = new MemoryStorage();
    const quizzes = adapter(storage);
    storage.setItem("another-library:key", "keep");
    quizzes.save("quiz-1", "fp", { value: 1 });
    expect(quizzes.remove("quiz-1")).toBe(true);
    quizzes.flush();
    expect(quizzes.load("quiz-1", "fp")).toBeNull();

    quizzes.save("quiz-1", "fp", { value: 1 });
    quizzes.flush();
    expect(quizzes.clearAll()).toBe(true);
    expect(storage.getItem(quizzes.key("quiz-1"))).toBeNull();
    expect(storage.getItem("another-library:key")).toBe("keep");
  });

  test("fingerprints change with question definitions or order", () => {
    const original = fingerprintQuizDefinition(["one", "two"]);
    expect(fingerprintQuizDefinition(["one", "two"])).toBe(original);
    expect(fingerprintQuizDefinition(["two", "one"])).not.toBe(original);
    expect(fingerprintQuizDefinition(["one", "changed"])).not.toBe(original);
  });
});
