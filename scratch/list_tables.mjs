import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key] = rest.join('=').trim();
  return acc;
}, {});

async function fetchTables() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/?apikey=${env.VITE_SUPABASE_ANON_KEY}`);
  const data = await res.json();
  const tables = Object.keys(data.definitions || {}).filter(k => !k.endsWith('_response') && !k.endsWith('_request'));
  console.log('Tables found:', tables);
}

fetchTables();
