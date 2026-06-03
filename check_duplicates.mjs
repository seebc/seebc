import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcXB0bXVvaGRudmR0dmtsYm5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyOTY3OCwiZXhwIjoyMDg5NzA1Njc4fQ.e5CkIiEB3kfkGOC4jVIcODP7rdmOSm632zn4ZU-yTDs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Verificando duplicados en Supabase...');
  let allData = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;

  while (hasMore) {
    const { data, error } = await supabase
      .from('secciones')
      .select('id, municipio_id')
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
  
  const idCounts = {};
  const duplicates = [];
  
  allData.forEach(row => {
    if (!idCounts[row.id]) {
      idCounts[row.id] = 1;
    } else {
      idCounts[row.id]++;
      duplicates.push(row.id);
    }
  });

  if (duplicates.length > 0) {
    console.log(`\nSe encontraron ${duplicates.length} IDs duplicados en la base de datos.`);
    console.log(duplicates.join(', '));
  } else {
    console.log('\nNo se encontraron IDs duplicados en la base de datos. La columna "id" probablemente es llave primaria.');
  }
}

main();
