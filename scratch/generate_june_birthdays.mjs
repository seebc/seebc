import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function generateCSV() {
  console.log("Fetching data from rg...");
  const { data: rgData, error: rgError } = await supabase.from('rg').select('*');
  if (rgError) console.error("Error fetching rg:", rgError);
  
  console.log("Fetching data from rc...");
  const { data: rcData, error: rcError } = await supabase.from('rc').select('*');
  if (rcError) console.error("Error fetching rc:", rcError);

  const members = [...(rgData || []).map(r => ({ ...r, tipo: 'RG' })), ...(rcData || []).map(r => ({ ...r, tipo: 'RC' }))];
  
  console.log(`Total records: ${members.length}`);

  const juneBirthdays = members.filter(m => {
    // Clave de elector: 6 letters, 6 numbers (YYMMDD), etc.
    // e.g. GOMGZN850615...
    if (!m.clave_elector || m.clave_elector.length < 12) return false;
    const month = m.clave_elector.substring(8, 10);
    return month === '06';
  });

  console.log(`Found ${juneBirthdays.length} members with birthdays in June.`);

  if (juneBirthdays.length > 0) {
    const csvHeader = "TIPO,NOMBRE,APELLIDO_PATERNO,APELLIDO_MATERNO,CLAVE_ELECTOR,TELEFONO\n";
    const csvRows = juneBirthdays.map(m => {
      return `${m.tipo},"${m.nombre}","${m.apellido_paterno}","${m.apellido_materno || ''}","${m.clave_elector}","${m.telefono || ''}"`;
    }).join('\n');

    fs.writeFileSync('cumpleanos_junio.csv', csvHeader + csvRows);
    console.log('Successfully written to cumpleanos_junio.csv');
  }
}

generateCSV();
