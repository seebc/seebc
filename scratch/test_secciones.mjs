import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://oiqptmuohdnvdtvklbnr.supabase.co', 'sb_publishable_Wwhi7vrH-c31MlVNgngUdQ_H8WI1c-r');

async function test() {
  const { count, error } = await supabase.from('secciones').select('*', { count: 'exact', head: true });
  console.log('Count secciones:', count, 'Error:', error);
  const { data: sample } = await supabase.from('secciones').select('*').limit(5);
  console.log('Sample secciones:', sample);
  const { data: casillasSample } = await supabase.from('casillas').select('*').limit(5);
  console.log('Sample casillas:', casillasSample);
  process.exit(0);
}

test();
