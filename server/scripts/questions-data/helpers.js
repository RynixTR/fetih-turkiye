// server/scripts/questions-data/helpers.js
function mc(id, category, difficulty, text, correct, distractors, explanation, timeLimit = 20) {
  if (!distractors || distractors.length !== 4) {
    throw new Error(`[${id}] Must have exactly 4 distractors! Got: ${distractors ? distractors.length : 0}`);
  }
  // Balanced pseudo-random option placement based on string hash
  const hash = id.split('').reduce((acc, c) => (acc * 33 + c.charCodeAt(0)) % 1000000, 7);
  const correctIndex = hash % 5;
  const options = [];
  let d = 0;
  for (let i = 0; i < 5; i++) {
    if (i === correctIndex) options.push(correct);
    else options.push(distractors[d++]);
  }
  return {
    id,
    type: 'multiple_choice',
    category,
    difficulty,
    text,
    options,
    correctIndex,
    explanation,
    timeLimit
  };
}

function num(id, category, difficulty, text, correctAnswer, unit, explanation, timeLimit = 22) {
  return {
    id,
    type: 'numeric',
    category,
    difficulty,
    text,
    correctAnswer: Number(correctAnswer),
    unit,
    explanation,
    timeLimit
  };
}

module.exports = { mc, num };
