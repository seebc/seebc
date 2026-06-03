import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'sb_publishable_Wwhi7vrH-c31MlVNgngUdQ_H8WI1c-r';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Count in Supabase
  const { count, error } = await supabase
    .from('secciones')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error fetching count from Supabase:', error);
    return;
  }
  
  // Count in CSV
  const fileStream = fs.createReadStream('secciones_may_2026.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let csvCount = 0;
  let isFirstLine = true;
  
  const csvSecciones = new Set();
  let seccionIndex = -1;

  for await (const line of rl) {
    const parts = line.split(',');
    if (isFirstLine) {
      seccionIndex = parts.indexOf('SECCION');
      isFirstLine = false;
      continue;
    }
    if (parts.length > 1 && parts[seccionIndex]) {
      csvSecciones.add(parts[seccionIndex].trim());
    }
  }

  console.log(`\n--- RESULTADOS ---`);
  console.log(`Número de secciones en la tabla (Supabase): ${count}`);
  console.log(`Número de secciones en el archivo CSV: ${csvSecciones.size}`);
}

main();
