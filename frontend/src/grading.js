export class MathVariableError extends Error {
  constructor(message) {
    super(message);
    this.name = "MathVariable";
  }
}

export function floatEqual(a, b) {
  if (a === b) {
    return true;
  }

  const difference = Math.abs(a - b);
  if (difference < 1e-8) {
    return true;
  }

  return difference <= 1e-8 * Math.min(Math.abs(a), Math.abs(b));
}

export function compareMathExpressions(
  first,
  second,
  variables,
  tries,
  random = Math.random,
) {
  for (let trial = 0; trial < tries; trial += 1) {
    const scope = {};
    for (const [key, value] of Object.entries(variables)) {
      scope[key] = random() * (value[1] - value[0]) + value[0];
    }

    const firstResult = first.evaluate(scope);
    const secondResult = second.evaluate(scope);
    if (typeof firstResult !== "number" || typeof secondResult !== "number") {
      throw new MathVariableError("Some variables wee not substituted");
    }
    if (!floatEqual(firstResult, secondResult)) {
      return false;
    }
  }
  return true;
}

function allTrim(value) {
  return value.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
}

function compareValue(correctAnswers, givenAnswer, options) {
  let candidate = givenAnswer;
  if (options.noSpace) {
    candidate = candidate.replace(/\s/g, "");
  }

  for (let index = 0; index < correctAnswers.length; index += 1) {
    let matches = false;
    let correct = correctAnswers[index];
    if (options.noSpace) {
      correct = correct.replace(/\s/g, "");
    }

    if (options.math) {
      let correctExpression;
      try {
        correctExpression = options.compileMath(correct);
      } catch (_error) {
        options.onCorrectAnswerSyntaxError(correct);
      }
      const givenExpression = options.compileMath(candidate);
      matches = compareMathExpressions(
        givenExpression,
        correctExpression,
        options.mathVariables,
        options.mathTries,
        options.random,
      );
    } else if (options.fuzzy) {
      matches = options.fuzzyEqual(correct, candidate);
    } else if (options.regex) {
      matches = new RegExp(correct).test(candidate);
    } else {
      // Deliberately retain the runtime's loose string and number comparison.
      matches = correct == candidate || Number(correct) == Number(candidate);
    }

    if (matches) {
      correctAnswers.splice(index, 1);
      return true;
    }
  }
  return false;
}

export function testAnswer(correctAnswer, givenAnswer, options = {}) {
  const settings = {
    sequence: false,
    fuzzy: false,
    noSpace: false,
    math: false,
    regex: false,
    ordered: false,
    mathVariables: {},
    mathTries: 50,
    random: Math.random,
    fuzzyEqual: (first, second) => first === second,
    compileMath: undefined,
    onCorrectAnswerSyntaxError: () => {},
    ...options,
  };

  const correctAnswers = settings.sequence
    ? allTrim(correctAnswer).split(/[\s,;]+/)
    : [correctAnswer];
  const givenAnswers = settings.sequence
    ? allTrim(givenAnswer).split(/[\s,;]+/)
    : [givenAnswer];
  const expectedElements = correctAnswers.length;
  let correctElements = 0;
  let wrongElements = 0;

  for (let index = 0; index < givenAnswers.length; index += 1) {
    const candidates = settings.ordered ? [correctAnswers[index]] : correctAnswers;
    if (compareValue(candidates, givenAnswers[index], settings)) {
      correctElements += 1;
    } else {
      wrongElements += 1;
    }
  }

  return expectedElements === correctElements && wrongElements === 0;
}
