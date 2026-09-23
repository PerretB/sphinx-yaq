import { describe, expect, it } from "vitest";

import {
  ActivityState,
  QuestionState,
  calculateActivityState,
} from "../src/model.js";

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
    [
      "legacy terminal wrong TF state",
      [QuestionState.wrong | QuestionState.solved],
      ActivityState.ended | ActivityState.solvable,
    ],
  ])("preserves %s aggregation", (_label, states, expected) => {
    expect(calculateActivityState(states)).toBe(expected);
  });
});
