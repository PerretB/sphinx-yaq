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

const DECIMAL = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/;

function parseDecimal(value) {
  const match = DECIMAL.exec(value);
  if (!match || !Number.isFinite(Number(value))) return null;
  const fractional = match[3] ?? match[4] ?? "";
  const digits = ((match[2] ?? "") + fractional).replace(/^0+/, "");
  if (!digits) return "0";
  const coefficient = digits.replace(/0+$/, "");
  const exponent = BigInt(match[5] ?? "0") - BigInt(fractional.length) +
    BigInt(digits.length - coefficient.length);
  return `${match[1] === "-" ? "-" : ""}${coefficient}e${exponent}`;
}

function exactEqual(first, second) {
  const left = first.normalize("NFC");
  const right = second.normalize("NFC");
  if (left === right) return true;
  const leftNumber = parseDecimal(left);
  const rightNumber = parseDecimal(right);
  return leftNumber !== null && rightNumber !== null && leftNumber === rightNumber;
}

function fuzzyText(value) {
  return allTrim(value.normalize("NFKD").replace(/\p{M}/gu, "")).toLowerCase();
}

export function fuzzyEqual(first, second, threshold = 0.8) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new RangeError("fuzzyThreshold must be between 0 and 1");
  }
  const left = Array.from(fuzzyText(first));
  const right = Array.from(fuzzyText(second));
  const length = Math.max(left.length, right.length);
  if (length === 0) return true;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return 1 - previous[right.length] / length >= threshold;
}

function sequenceTokens(value) {
  const trimmed = value.trim();
  return trimmed === "" ? [] : trimmed.split(/[\s,;]+/).filter(Boolean);
}

function compareText(first, second, settings) {
  const left = settings.noSpace ? first.replace(/\s/gu, "") : first;
  const right = settings.noSpace ? second.replace(/\s/gu, "") : second;
  return settings.fuzzy
    ? settings.fuzzyEqual(left, right, settings.fuzzyThreshold)
    : exactEqual(left, right);
}

function compareTextAnswers(correctAnswer, givenAnswer, settings) {
  if (!settings.sequence) return compareText(correctAnswer, givenAnswer, settings);
  const expected = sequenceTokens(correctAnswer);
  const given = sequenceTokens(givenAnswer);
  if (expected.length === 0 || expected.length !== given.length) return false;
  if (settings.ordered) {
    return given.every((value, index) => compareText(expected[index], value, settings));
  }

  // Find a one-to-one match; greedy matching gives wrong answers for fuzzy tokens.
  const assigned = Array(expected.length).fill(-1);
  function place(givenIndex, visited) {
    for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
      if (visited[expectedIndex] || !compareText(expected[expectedIndex], given[givenIndex], settings)) continue;
      visited[expectedIndex] = true;
      if (assigned[expectedIndex] === -1 || place(assigned[expectedIndex], visited)) {
        assigned[expectedIndex] = givenIndex;
        return true;
      }
    }
    return false;
  }
  return given.every((_, index) => place(index, Array(expected.length).fill(false)));
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
    fuzzyThreshold: 0.8,
    noSpace: false,
    math: false,
    regex: false,
    ordered: false,
    mathVariables: {},
    mathTries: 50,
    random: Math.random,
    fuzzyEqual,
    compileMath: undefined,
    onCorrectAnswerSyntaxError: () => {},
    ...options,
  };

  if (settings.fuzzy && (!Number.isFinite(settings.fuzzyThreshold) ||
      settings.fuzzyThreshold < 0 || settings.fuzzyThreshold > 1)) {
    throw new RangeError("fuzzyThreshold must be between 0 and 1");
  }
  if (!settings.math && !settings.regex) {
    return compareTextAnswers(correctAnswer, givenAnswer, settings);
  }

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
