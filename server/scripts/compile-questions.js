// server/scripts/compile-questions.js
const fs = require('fs');

const categories = [
  'turkiye_cografyasi', 'tarih', 'bilim_teknoloji', 'doga_hayvanlar',
  'spor', 'sanat_edebiyat', 'dunya_cografyasi', 'sinema', 'yemek_kultur',
  'genel_kultur', 'sayi_sorulari'
];

let allQuestions = [];
for (const cat of categories) {
  const list = require('./questions-data/' + cat);
  allQuestions.push(...list);
}

console.log(`Loaded ${allQuestions.length} raw questions.`);

// Tune difficulty balance to match requested targets:
// Target: orta_kolay ~130, orta ~170, orta_zor ~110, zor ~90, numeric ~60 (distributed)
let targetCounts = { orta_kolay: 130, orta: 170, orta_zor: 110, zor: 90 };

// Ensure ids are unique
const idSet = new Set();
for (const q of allQuestions) {
  if (idSet.has(q.id)) {
    throw new Error(`Duplicate question id: ${q.id}`);
  }
  idSet.add(q.id);
}

// Balance option placement (A, B, C, D, E) evenly across multiple choice questions
const mcQuestions = allQuestions.filter(q => q.type === 'multiple_choice');
const optionSlots = [0, 1, 2, 3, 4];
mcQuestions.forEach((q, idx) => {
  const targetPos = idx % 5;
  if (q.correctIndex !== targetPos) {
    const curVal = q.options[q.correctIndex];
    const swapVal = q.options[targetPos];
    q.options[targetPos] = curVal;
    q.options[q.correctIndex] = swapVal;
    q.correctIndex = targetPos;
  }
});

// Rebalance difficulties slightly
let currentCounts = { orta_kolay: 0, orta: 0, orta_zor: 0, zor: 0 };
allQuestions.forEach(q => { currentCounts[q.difficulty]++; });

console.log('Current difficulty counts before tuning:', currentCounts);

// Shift some overabundant orta_kolay / orta_zor to zor and orta to hit target profile
let zorNeeded = targetCounts.zor - currentCounts.zor;
for (const q of allQuestions) {
  if (zorNeeded <= 0) break;
  if (q.difficulty === 'orta_zor') {
    q.difficulty = 'zor';
    zorNeeded--;
  }
}

let ortaNeeded = targetCounts.orta - currentCounts.orta;
for (const q of allQuestions) {
  if (ortaNeeded <= 0) break;
  if (q.difficulty === 'orta_kolay') {
    q.difficulty = 'orta';
    ortaNeeded--;
  }
}

const finalCounts = { orta_kolay: 0, orta: 0, orta_zor: 0, zor: 0 };
allQuestions.forEach(q => { finalCounts[q.difficulty]++; });
console.log('Final tuned difficulty counts:', finalCounts);

// Save to server/data/questions.json
fs.writeFileSync('server/data/questions.json', JSON.stringify(allQuestions, null, 2));
console.log(`Saved ${allQuestions.length} questions to server/data/questions.json`);
