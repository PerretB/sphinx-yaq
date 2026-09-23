import { describe, expect, it } from "vitest";

import {
  ActivityState,
  QuestionState,
  answerChanged,
  calculateActivityState,
  gradeAnswer,
  resetAnswer,
  revealAnswer,
} from "../src/model.js";

describe("question transitions", () => {
  const initial = { enabled: true, state: QuestionState.unsolved, value: "" };

  it("marks an edited answer as unanswered without mutating the input", () => {
    const edited = answerChanged({ ...initial, state: QuestionState.wrong, value: "new" });
    expect(edited).toEqual({ ...initial, value: "new" });
  });

  it("keeps wrong answers enabled for retry", () => {
    expect(gradeAnswer(initial, { answered: true, correct: false })).toEqual({
      ...initial,
      enabled: true,
      state: QuestionState.wrong,
    });
  });

  it("disables correct and revealed answers while distinguishing their states", () => {
    expect(gradeAnswer(initial, { answered: true, correct: true })).toEqual({
      ...initial,
      enabled: false,
      state: QuestionState.correct,
    });
    expect(revealAnswer(initial)).toEqual({
      ...initial,
      enabled: false,
      state: QuestionState.solved,
    });
  });

  it("leaves missing answers unanswered and reset restores the initial state", () => {
    const wrong = { ...initial, enabled: false, state: QuestionState.wrong };
    expect(gradeAnswer(wrong, { answered: false, correct: false })).toEqual({
      ...wrong,
      state: QuestionState.unsolved,
    });
    expect(resetAnswer(wrong)).toEqual(initial);
  });
});

describe("calculateActivityState", () => {
  it.each([
    ["empty activity", [], ActivityState.ended],
    ["unanswered", [QuestionState.unsolved], ActivityState.ongoing],
    ["all correct", [QuestionState.correct, QuestionState.correct], ActivityState.ended],
    ["retryable wrong", [QuestionState.wrong], ActivityState.ongoing | ActivityState.solvable],
    [
      "wrong plus unanswered",
      [QuestionState.wrong, QuestionState.unsolved],
      ActivityState.ongoing,
    ],
    [
      "correct and revealed",
      [QuestionState.correct, QuestionState.solved],
      ActivityState.ended | ActivityState.solvable,
    ],
  ])("derives %s aggregation", (_label, states, expected) => {
    expect(calculateActivityState(states)).toBe(expected);
  });
});
