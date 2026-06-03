# 🤖 SEEBC Telegram Bot

Bot de Telegram para captura de Representantes Generales (RG) y Representantes de Casilla (RC). Solo usuarios con número de teléfono registrado en la base de datos pueden acceder.

---

## Estructura del proyecto

```
telegram-bot/
├── src/
│   ├── index.js                  # Entrada principal del bot
│   ├── db.js                     # Cliente Supabase + helpers
│   ├── middleware.js             # Auth y admin middleware
│   ├── teclados.js              # Keyboards reutilizables
│   └── conversations/
│       ├── captura_rg.js        # Flujo de captura RG (5 pasos)
│       └── captura_rc.js        # Flujo de captura RC (5 pasos + foto)
├── migration.sql                 # Tablas en Supabase
├── .env.example                  # Variables de entorno
└── package.json
```

---

## ⚙️ Configuración rápida

### 1. Crear el bot en Telegram

1. Abre Telegram y busca **@BotFather**
2. Escribe `/newbot` y sigue las instrucciones
3. Copia el token que te da (formato: `123456:ABC-DEF...`)

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa:

```env
BOT_TOKEN=<token de BotFather>
SUPABASE_URL=https://oiqptmuohdnvdtvklbnr.supabase.co
SUPABASE_SERVICE_KEY=<service_role key de Supabase>
ADMIN_IDS=<tu telegram ID>
```

> **¿Cómo obtengo mi Telegram ID?**  
> Escríbele a [@userinfobot](https://t.me/userinfobot) en Telegram, te dirá tu ID.

> **¿Dónde está el Service Role Key de Supabase?**  
> En tu proyecto Supabase → Settings → API → `service_role` key (¡no la anon key!)

### 3. Ejecutar la migración SQL

Copia el contenido de `migration.sql` y ejecútalo en:  
**Supabase Dashboard → SQL Editor**

Esto crea:
- Columnas `telegram_id` y `bot_activo` en la tabla `miembros`
- Tabla `capturas_rg`
- Tabla `capturas_rc`
- Vista `v_capturas_hoy`

### 4. Instalar dependencias e iniciar

```bash
cd telegram-bot
npm install
npm run dev    # desarrollo (con hot-reload)
npm start      # producción
```

---

## 📱 Flujo de uso

### Primera vez (verificación)
```
Usuario → /start
Bot     → Pide compartir número de teléfono
Usuario → Toca el botón (Telegram comparte número verificado)
Bot     → Busca en tabla miembros
         ✅ Encontrado → vincula telegram_id, da acceso
         ❌ No encontrado → acceso denegado
```

### Captura RG
```
/captura_general
→ Número de ruta
→ Nombre del RG
→ Tipo de acción (llegó / salió / incidencia / cierre)
→ Notas opcionales
→ Confirmación → guardado en capturas_rg
```

### Captura RC
```
/captura_casilla
→ Sección electoral
→ Número de casilla
→ Nombre del RC
→ Tipo de acción
→ Foto de evidencia (opcional)
→ Confirmación → guardado en capturas_rc
```

---

## 🗄️ Consultar capturas del día (SQL)

```sql
SELECT * FROM v_capturas_hoy;
```

---

## 🚀 Despliegue en producción

Opciones recomendadas:
- **Railway** (más fácil, gratis hasta cierto límite)
- **Render** (plan gratuito con suspensión)
- **VPS propio** con `pm2`

```bash
# Con PM2
npm install -g pm2
pm2 start src/index.js --name seebc-bot
pm2 save
```
