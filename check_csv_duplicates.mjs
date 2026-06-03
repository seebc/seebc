import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('secciones_may_2026.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let seccionIndex = -1;
  const idCounts = {};
  const duplicates = [];

  for await (const line of rl) {
    const parts = line.split(',');
    if (isFirstLine) {
      seccionIndex = parts.indexOf('SECCION');
      isFirstLine = false;
      continue;
    }
    
    if (parts.length > 1 && parts[seccionIndex]) {
      const id = parts[seccionIndex].trim();
      if (!idCounts[id]) {
        idCounts[id] = 1;
      } else {
        idCounts[id]++;
        if (idCounts[id] === 2) { // solo guardarlo la primera vez que se detecta duplicado
          duplicates.push(id);
        }
      }
    }
  }

  if (duplicates.length > 0) {
    console.log(`\nSe encontraron ${duplicates.length} SECCIONES duplicadas en el archivo CSV.`);
    console.log(duplicates.join(', '));
  } else {
    console.log('\nNo se encontraron SECCIONES duplicadas en el archivo CSV.');
  }
}

main();
