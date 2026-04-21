
const fs = require('fs');
const path = require('path');

async function generateSql() {
  const filePath = path.join(__dirname, 'casillas_2024_mod.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  let sql = `-- MIGRACIÓN DE UBICACIONES (GENERADA AUTOMÁTICAMENTE)\n`;
  sql += `-- Desactivar triggers temporalmente (opcional, si no se aplicó el fix_trigger_casillas.sql)\n`;
  sql += `ALTER TABLE public.casillas DISABLE TRIGGER ALL;\n\n`;

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split CSV handle quotes correctly
    const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!parts || parts.length < 8) continue;

    const df = parts[0].trim();
    const dl = parts[1].trim();
    const municipioFull = parts[2].replace(/^"|"$/g, '').trim();
    const municipioMatch = municipioFull.match(/(\d+)\)/);
    const municipioId = municipioMatch ? municipioMatch[1] : null;
    
    const casillaName = parts[6].replace(/^"|"$/g, '').trim().replace(/'/g, "''");
    const ubicacion = parts[7].replace(/^"|"$/g, '').trim().replace(/'/g, "''").toUpperCase();

    if (casillaName && ubicacion && municipioId) {
      sql += `UPDATE public.casillas SET ubicación = '${ubicacion}' WHERE casilla = '${casillaName}' AND municipio = ${municipioId} AND df = ${df} AND dl = ${dl};\n`;
      count++;
    } else if (casillaName && ubicacion) {
        // Fallback matching
        sql += `UPDATE public.casillas SET ubicación = '${ubicacion}' WHERE casilla = '${casillaName}';\n`;
        count++;
    }
  }

  sql += `\nALTER TABLE public.casillas ENABLE TRIGGER ALL;\n`;
  sql += `-- Total de registros procesados: ${count}\n`;

  fs.writeFileSync(path.join(__dirname, 'bulk_update_casillas.sql'), sql);
  console.log(`Generado bulk_update_casillas.sql con ${count} actualizaciones.`);
}

generateSql();
