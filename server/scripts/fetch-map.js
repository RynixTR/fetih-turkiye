// server/scripts/fetch-map.js
const fs = require('fs');

async function main() {
  console.log('Fetching Turkey SVG map...');
  const res = await fetch('https://raw.githubusercontent.com/dnomak/svg-turkiye-haritasi/master/index.html');
  const html = await res.text();

  const svgStart = html.indexOf('<svg');
  const svgEnd = html.indexOf('</svg>', svgStart);
  if (svgStart === -1 || svgEnd === -1) {
    throw new Error('SVG not found in HTML');
  }

  const svgContent = html.substring(svgStart, svgEnd + 6);
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 1007.478 527.323';

  // Find all <g elements that have data-plakakodu
  // Match each province block: <g id="..." data-plakakodu="..." ...> ... </g>
  // Notice each province group contains <path ... /> and closes with </g>
  const provinceBlocks = svgContent.split(/<g\s+(?=id=)/i);
  const provinces = [];

  for (const block of provinceBlocks) {
    const plateMatch = block.match(/data-plakakodu=["']([^"']+)["']/i);
    if (!plateMatch) continue;

    const idMatch = block.match(/id=["']([^"']+)["']/i);
    const nameMatch = block.match(/data-iladi=["']([^"']+)["']/i);

    // Get all paths in this group up to the first </g>
    const groupEnd = block.indexOf('</g>');
    const groupContent = groupEnd !== -1 ? block.substring(0, groupEnd) : block;
    const paths = [...groupContent.matchAll(/<path\s+[^>]*?d=["']([^"']+)["']/gi)].map(m => m[1]);

    if (paths.length > 0) {
      provinces.push({
        id: idMatch ? idMatch[1] : `tr-${plateMatch[1]}`,
        name: nameMatch ? nameMatch[1] : '',
        plate: parseInt(plateMatch[1], 10),
        paths
      });
    }
  }

  // Sort by plate
  provinces.sort((a, b) => a.plate - b.plate);

  console.log(`Successfully parsed ${provinces.length} provinces.`);
  const plates = new Set(provinces.map(p => p.plate));
  for (let i = 1; i <= 81; i++) {
    if (!plates.has(i)) {
      console.warn('Still missing plate:', i);
    }
  }

  fs.writeFileSync('server/data/provinces-raw.json', JSON.stringify({
    viewBox,
    provinces
  }, null, 2));
  console.log('Saved to server/data/provinces-raw.json');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
