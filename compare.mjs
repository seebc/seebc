import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'sb_publishable_Wwhi7vrH-c31MlVNgngUdQ_H8WI1c-r';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching from Supabase...');
  // Since we might have many rows, we can fetch all by handling pagination, 
  // but if it's < 1000, one query is enough.
  const { data, error } = await supabase.from('secciones').select('id');
  if (error) {
    console.error('Error fetching table data:', error);
    return;
  }
  
  const dbSecciones = new Set(data.map(row => row.id.toString()));
  console.log(`Found ${dbSecciones.size} secciones in database.`);

  const csvSecciones = new Set();
  
  console.log('Reading CSV...');
  const fileStream = fs.createReadStream('secciones_may_2026.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let seccionIndex = -1;

  for await (const line of rl) {
    const parts = line.split(',');
    if (isFirstLine) {
      seccionIndex = parts.indexOf('SECCION');
      isFirstLine = false;
      continue;
    }
    
    if (seccionIndex !== -1 && parts[seccionIndex]) {
      csvSecciones.add(parts[seccionIndex].trim());
    }
  }

  console.log(`Found ${csvSecciones.size} secciones in CSV.`);
  
  const missingInDb = [];
  for (const seccion of csvSecciones) {
    if (!dbSecciones.has(seccion)) {
      missingInDb.push(seccion);
    }
  }
  
  if (missingInDb.length > 0) {
    console.log(`\nFound ${missingInDb.length} secciones in CSV that are NOT in the database:`);
    console.log(missingInDb.join(', '));
  } else {
    console.log('\nAll secciones from the CSV are present in the database table.');
  }
}

main();
