import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcXB0bXVvaGRudmR0dmtsYm5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyOTY3OCwiZXhwIjoyMDg5NzA1Njc4fQ.e5CkIiEB3kfkGOC4jVIcODP7rdmOSm632zn4ZU-yTDs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Obtener TODAS las casillas de Supabase (paginando)
  console.log('Obteniendo casillas de Supabase...');
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('casillas')
      .select('casilla, municipio')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) { console.error('Error:', error); return; }
    if (data.length > 0) {
      allData = allData.concat(data);
      page++;
    } else {
      hasMore = false;
    }
  }

  // Normalizar: quitar espacios extra y pasar a mayúsculas
  const dbCasillas = new Set(allData.map(r => r.casilla?.trim().toUpperCase()));
  console.log(`Total casillas en Supabase: ${dbCasillas.size}`);

  // 2. Leer CSV
  console.log('Leyendo CSV...');
  const fileStream = fs.createReadStream('CASILLAS_MEXICALI_MAYO.csv');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isFirstLine = true;
  let headers = [];
  let casillaIdx = -1;
  let seccionIdx = -1;
  let tipoIdx = -1;

  const faltantes = [];

  for await (const line of rl) {
    const parts = line.split(',');
    if (isFirstLine) {
      headers = parts.map(h => h.trim().toUpperCase());
      casillaIdx = headers.indexOf('CASILLA');
      seccionIdx = headers.indexOf('SECCION');
      tipoIdx = headers.indexOf('TIPO');
      isFirstLine = false;
      continue;
    }
    if (parts.length < casillaIdx + 1) continue;

    const casilla = parts[casillaIdx]?.replace(/"/g, '').trim().toUpperCase();
    const seccion = parts[seccionIdx]?.replace(/"/g, '').trim();
    const tipo = parts[tipoIdx]?.replace(/"/g, '').trim();

    if (casilla && !dbCasillas.has(casilla)) {
      faltantes.push({ casilla, seccion, tipo });
    }
  }

  console.log(`\n--- RESULTADO ---`);
  console.log(`Casillas en el CSV: 1444`);
  console.log(`Casillas del CSV que NO están en Supabase: ${faltantes.length}`);
  
  if (faltantes.length > 0) {
    console.log('\nLista de casillas faltantes:');
    faltantes.forEach(f => console.log(`  Casilla: ${f.casilla}  |  Sección: ${f.seccion}  |  Tipo: ${f.tipo}`));
  } else {
    console.log('¡Todas las casillas del CSV ya están en Supabase!');
  }
}

main();
