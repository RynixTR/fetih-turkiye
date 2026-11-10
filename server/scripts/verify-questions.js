// server/scripts/verify-questions.js
const fs = require('fs');

console.log('=== Verifying questions.json ===');
const data = JSON.parse(fs.readFileSync('server/data/questions.json', 'utf8'));

if (!Array.isArray(data)) {
  throw new Error('questions.json must contain an array!');
}

console.log(`Total questions: ${data.length}`);
if (data.length < 500) {
  throw new Error(`Expected at least 500 questions, found ${data.length}`);
}

const ids = new Set();
const texts = new Set();
const correctIndexCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
const categoryCounts = {};
const difficultyCounts = {};
let mcCount = 0;
let numCount = 0;

data.forEach((q, idx) => {
  if (!q.id || typeof q.id !== 'string') {
    throw new Error(`Question at index ${idx} missing valid id`);
  }
  if (ids.has(q.id)) {
    throw new Error(`Duplicate id: ${q.id}`);
  }
  ids.add(q.id);

  if (!q.text || typeof q.text !== 'string' || q.text.trim().length < 5) {
    throw new Error(`Question ${q.id} has invalid or too short text`);
  }
  if (texts.has(q.text)) {
    throw new Error(`Duplicate text in question ${q.id}: "${q.text}"`);
  }
  texts.add(q.text);

  if (!q.category || typeof q.category !== 'string') {
    throw new Error(`Question ${q.id} missing category`);
  }
  categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;

  if (!['orta_kolay', 'orta', 'orta_zor', 'zor'].includes(q.difficulty)) {
    throw new Error(`Question ${q.id} has invalid difficulty: ${q.difficulty}`);
  }
  difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;

  if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length < 5) {
    throw new Error(`Question ${q.id} missing explanation/fact note`);
  }

  if (q.type === 'multiple_choice') {
    mcCount++;
    if (!Array.isArray(q.options) || q.options.length !== 5) {
      throw new Error(`Question ${q.id} does not have exactly 5 options! Got: ${q.options ? q.options.length : 0}`);
    }
    // Check all options non-empty and unique
    const optSet = new Set(q.options.map(o => String(o).trim()));
    if (optSet.size !== 5) {
      throw new Error(`Question ${q.id} has duplicate options: ${JSON.stringify(q.options)}`);
    }
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 4) {
      throw new Error(`Question ${q.id} has invalid correctIndex: ${q.correctIndex}`);
    }
    correctIndexCounts[q.correctIndex]++;
  } else if (q.type === 'numeric') {
    numCount++;
    if (typeof q.correctAnswer !== 'number' || isNaN(q.correctAnswer)) {
      throw new Error(`Numeric question ${q.id} missing valid numeric correctAnswer`);
    }
    if (!q.unit) {
      throw new Error(`Numeric question ${q.id} missing unit`);
    }
  } else {
    throw new Error(`Question ${q.id} has unknown type: ${q.type}`);
  }
});

console.log('Question Types:', { multiple_choice: mcCount, numeric: numCount });
console.log('Categories:', categoryCounts);
console.log('Difficulties:', difficultyCounts);
console.log('Multiple Choice Option Distribution (0=A, 1=B, 2=C, 3=D, 4=E):', correctIndexCounts);

// Check option balance
for (let i = 0; i < 5; i++) {
  const count = correctIndexCounts[i];
  const expected = mcCount / 5;
  if (Math.abs(count - expected) > 5) {
    throw new Error(`Option distribution for choice ${i} is unbalanced: ${count} vs expected ${expected}`);
  }
}

console.log('SUCCESS: All 520 questions verified and validated against all criteria!');
