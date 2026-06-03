import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcXB0bXVvaGRudmR0dmtsYm5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyOTY3OCwiZXhwIjoyMDg5NzA1Njc4fQ.e5CkIiEB3kfkGOC4jVIcODP7rdmOSm632zn4ZU-yTDs';
const supabase = createClient(supabaseUrl, supabaseKey);

const municipioMap = {
  'ENSENADA': 1,
  'MEXICALI': 2,
  'TECATE': 3,
  'TIJUANA': 4,
  'PLAYAS DE ROSARITO': 5,
  'ROSARITO': 5,
  'SAN QUINTIN': 6,
  'SAN FELIPE': 7
};

async function main() {
  console.log('Fetching existing secciones from Supabase...');
  let allData = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;

  while (hasMore) {
    const { data, error } = await supabase
      .from('secciones')
      .select('id')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching table data:', error);
      return;
    }

    if (data.length > 0) {
      allData = allData.concat(data);
      page++;
    } else {
      hasMore = false;
    }
  }
  
  const dbSecciones = new Set(allData.map(row => row.id.toString()));
  console.log(`Found ${dbSecciones.size} secciones in database.`);

  console.log('Reading CSV...');
  const fileStream = fs.createReadStream('secciones_may_2026.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let headers = [];
  const recordsToInsert = [];

  for await (const line of rl) {
    const parts = line.split(',');
    if (isFirstLine) {
      headers = parts.map(h => h.trim());
      isFirstLine = false;
      continue;
    }
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = parts[index] ? parts[index].trim() : null;
    });

    if (row['SECCION'] && !dbSecciones.has(row['SECCION'])) {
      const df_id = parseInt(row['DF'], 10);
      const dl_id = parseInt(row['DL'], 10);
      const municipio_id = municipioMap[row['MUNICIPIO']];
      
      if (!isNaN(df_id) && !isNaN(dl_id) && municipio_id) {
        recordsToInsert.push({
          id: parseInt(row['SECCION'], 10),
          df_id: df_id,
          dl_id: dl_id,
          municipio_id: municipio_id
        });
      }
    }
  }

  console.log(`Prepared ${recordsToInsert.length} records to insert.`);

  // Insert in batches of 200
  const batchSize = 200;
  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);
    console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}...`);
    
    const { error: insertError } = await supabase
      .from('secciones')
      .insert(batch);
      
    if (insertError) {
      console.error('Error inserting batch:', insertError);
      return;
    }
  }

  console.log('All missing records inserted successfully!');
}

main();
