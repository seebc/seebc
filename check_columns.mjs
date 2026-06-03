import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'sb_publishable_Wwhi7vrH-c31MlVNgngUdQ_H8WI1c-r';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('secciones').select('*').limit(1);
  if (error) {
    console.error('Error fetching table data:', error);
    return;
  }
  console.log('Columns in secciones table:', Object.keys(data[0] || {}));
}

main();
