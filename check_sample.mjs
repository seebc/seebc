import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'sb_publishable_Wwhi7vrH-c31MlVNgngUdQ_H8WI1c-r';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('secciones').select('*').limit(2);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample rows:', data);
  }
}
main();
