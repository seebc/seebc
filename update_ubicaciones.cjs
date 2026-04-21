
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseKey = 'sb_publishable_Wwhi7vrH-c31MlVNgngUdQ_H8WI1c-r';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runBatchMigration() {
  const filePath = path.join(__dirname, 'casillas_2024_mod.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  console.log(`--- INICIANDO MIGRACIÓN DE ${lines.length - 1} REGISTROS ---`);
  
  // 1. Cargar mapeo de casillas actuales para obtener IDs
  console.log('Cargando catálogo completo de casillas desde la DB...');
  let allCasillas = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('casillas')
      .select('casilla_id, casilla, municipio, df, dl')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error al cargar casillas:', error.message);
      return;
    }

    allCasillas = allCasillas.concat(data);
    if (data.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  // Crear un mapa para búsqueda rápida: "MUNICIPIO-DF-DL-NOMBRE" -> casilla_id
  const casillaMap = new Map();
  allCasillas.forEach(c => {
    const key = `${c.municipio}-${c.df}-${c.dl}-${c.casilla.trim().toUpperCase()}`;
    casillaMap.set(key, c.casilla_id);
  });

  console.log(`Catálogo cargado: ${allCasillas.length} casillas encontradas.`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // 2. Procesar CSV
  const BATCH_SIZE = 50; // Procesar de 50 en 50 para no saturar
  
  for (let i = 1; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const parts = trimmedLine.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      if (!parts || parts.length < 8) return;

      const df = parts[0].trim();
      const dl = parts[1].trim();
      const municipioFull = parts[2].replace(/^"|"$/g, '').trim();
      const municipioMatch = municipioFull.match(/(\d+)\)/);
      const municipioId = municipioMatch ? municipioMatch[1] : null;
      const casillaName = parts[6].replace(/^"|"$/g, '').trim().toUpperCase();
      const ubicacion = parts[7].replace(/^"|"$/g, '').trim().toUpperCase();

      if (!municipioId) return;

      const key = `${municipioId}-${df}-${dl}-${casillaName}`;
      const casilla_id = casillaMap.get(key);

      if (casilla_id) {
        const { error } = await supabase.rpc('save_casilla_secure', {
          p_id: casilla_id,
          p_payload: {
            ubicación: ubicacion,
            casilla: casillaName,
            df: parseInt(df),
            dl: parseInt(dl),
            municipio: parseInt(municipioId),
            capturista_id: 1
          }
        });

        if (!error) {
          successCount++;
        } else {
          console.error(`Error en Casilla ${casillaName}:`, error.message);
          errorCount++;
        }
      } else {
        skipCount++;
      }
    });

    await Promise.all(promises);
    process.stdout.write(`Progreso: ${Math.min(i + BATCH_SIZE - 1, lines.length - 1)}/${lines.length - 1}...\r`);
  }

  console.log('\n--- MIGRACIÓN FINALIZADA ---');
  console.log(`Éxito: ${successCount}`);
  console.log(`No encontradas: ${skipCount}`);
  console.log(`Errores: ${errorCount}`);
}

runBatchMigration().catch(console.error);
