import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcXB0bXVvaGRudmR0dmtsYm5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyOTY3OCwiZXhwIjoyMDg5NzA1Njc4fQ.e5CkIiEB3kfkGOC4jVIcODP7rdmOSm632zn4ZU-yTDs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Ver columnas de la tabla casillas
  const { data: sample } = await supabase.from('casillas').select('*').limit(2);
  console.log('Columnas de tabla casillas:', Object.keys(sample?.[0] || {}));
  console.log('Muestra:', sample);
}
main();
