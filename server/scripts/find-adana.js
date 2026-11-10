// server/scripts/find-adana.js
const fs = require('fs');

async function main() {
  const res = await fetch('https://raw.githubusercontent.com/dnomak/svg-turkiye-haritasi/master/index.html');
  const html = await res.text();

  const idx = html.indexOf('Adana');
  console.log('Index of Adana:', idx);
  if (idx !== -1) {
    console.log('Snippet around Adana:\n', html.substring(idx - 150, idx + 350));
  }

  const idx01 = html.indexOf('plakakodu="01"');
  console.log('Index of plakakodu="01":', idx01);
  if (idx01 !== -1) {
    console.log('Snippet around plakakodu="01":\n', html.substring(idx01 - 150, idx01 + 350));
  }
}

main();
