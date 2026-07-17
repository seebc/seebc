import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        conname AS constraint_name, 
        conrelid::regclass AS table_name, 
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' 
        AND conrelid::regclass::text IN ('rg', 'rc');
    `
  });
  
  if (error) {
    // If execute_sql RPC doesn't exist, we can try running a direct query or check if there is an RPC we can use.
    console.error("Error fetching constraints:", error);
    
    // Let's try executing via a simple anonymous PG block if possible, or just print the error.
  } else {
    console.log("Constraints:", data);
  }
}

main();
