export const QuestionState = Object.freeze({
  unsolved: 1,
  correct: 2,
  wrong: 4,
  solved: 8,
});

export const ActivityState = Object.freeze({
  ongoing: 1,
  solvable: 2,
  ended: 4,
});

export function answerChanged(model) {
  return { ...model, state: QuestionState.unsolved };
}

export function gradeAnswer(model, { answered, correct }) {
  if (!answered) {
    return { ...model, state: QuestionState.unsolved };
  }
  if (correct) {
    return { ...model, enabled: false, state: QuestionState.correct };
  }
  return { ...model, enabled: true, state: QuestionState.wrong };
}

export function revealAnswer(model) {
  return { ...model, enabled: false, state: QuestionState.solved };
}

export function resetAnswer(model) {
  return { ...model, enabled: true, state: QuestionState.unsolved };
}

export function calculateActivityState(questionStates) {
  let allCorrect = true;
  let anyUnsolved = false;
  let allCorrectOrSolved = true;

  for (const state of questionStates) {
    if (state & QuestionState.unsolved) {
      anyUnsolved = true;
    }
    if (!(state & QuestionState.correct)) {
      allCorrect = false;
    }
    if (!(state & QuestionState.correct) && !(state & QuestionState.solved)) {
      allCorrectOrSolved = false;
    }
  }

  let activityState = allCorrectOrSolved
    ? ActivityState.ended
    : ActivityState.ongoing;
  if (!allCorrect && !anyUnsolved) {
    activityState |= ActivityState.solvable;
  }
  return activityState;
}
