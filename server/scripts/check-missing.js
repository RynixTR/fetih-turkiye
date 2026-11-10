// server/scripts/check-missing.js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('server/data/provinces-raw.json', 'utf8'));

const plates = new Set(data.provinces.map(p => p.plate));
console.log('Total parsed:', plates.size);
for (let i = 1; i <= 81; i++) {
  if (!plates.has(i)) {
    console.log('Missing plate:', i);
  }
}

// Also check the raw HTML for plate 1 or missing ones
const res = fs.readFileSync('server/scripts/fetch-map.js', 'utf8');
