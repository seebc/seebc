import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkClaves() {
  const { data: rgData } = await supabase.from('rg').select('clave_elector');
  const { data: rcData } = await supabase.from('rc').select('clave_elector');
  
  console.log("RG Claves:", rgData);
  console.log("RC Claves:", rcData);
}

checkClaves();
