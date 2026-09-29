# Mperform

Aplicacion web personal para seguimiento diario de rendimiento, construida con Next.js, Tailwind CSS, shadcn/ui y Prisma.

## Requisitos

- Node.js 20+
- npm

## Variables de entorno

Crea tu `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

Variables necesarias:

- `DATABASE_URL`: cadena de conexion PostgreSQL (Vercel Postgres/Neon).
- `APP_PASSWORD`: password unica para autenticacion simple de la app.
- `APP_SESSION_SECRET` (opcional): clave para firmar la cookie de sesion. Si no existe o esta vacia se usa `APP_PASSWORD`. Cambiarla cierra todas las sesiones abiertas.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Prisma

Para generar el cliente de Prisma:

```bash
npm run prisma:generate
```

Aplicar migraciones en produccion:

```bash
npx prisma migrate deploy
```

## Despliegue en Vercel

1. Crea un nuevo proyecto en Vercel e importa este repositorio.
2. En el proyecto de Vercel, agrega la integracion **Vercel Postgres**.
3. En `Settings > Environment Variables`, configura:
   - `DATABASE_URL` (la proporcionada por Vercel Postgres).
   - `APP_PASSWORD` (la clave de acceso a la app).
   - `APP_SESSION_SECRET` (secreto largo para firma de sesion).
   Marca cada variable para el entorno **Production** (y Preview si lo usas). Pega los
   valores sin comillas: en Vercel las comillas forman parte del valor.
4. Lanza un deploy. Las variables nuevas o modificadas solo se aplican en un deploy
   posterior, asi que tras cambiarlas usa **Redeploy**.
5. Las tablas se crean solas: en Vercel se ejecuta el script `vercel-build`
   (`prisma migrate deploy && next build`), que aplica las migraciones pendientes
   contra `DATABASE_URL` antes de compilar. Si falla, el deploy falla y el error
   aparece en el log de build. Para aplicarlas a mano desde tu equipo:

   ```bash
   DATABASE_URL="<url de produccion>" npx prisma migrate deploy
   ```

   Con Neon/Vercel Postgres usa la URL **sin pooling** (`DATABASE_URL_UNPOOLED` o
   `POSTGRES_URL_NON_POOLING`) para las migraciones.

## Diagnostico

`GET /api/health` es publico y devuelve, sin exponer valores, si `APP_PASSWORD`,
`APP_SESSION_SECRET` y `DATABASE_URL` estan definidas y si la base de datos responde.
Si indica `P2021`, faltan las migraciones.

### Logs en Vercel

El servidor escribe una linea JSON por evento (`{"nivel","evento",...,"entorno","ts"}`).
Consultalos en `Vercel > proyecto > Logs` (o `Deployments > deploy > Runtime Logs`)
y busca por el nombre del evento, por ejemplo `login.contrasena_incorrecta`.

| Evento | Nivel | Significado |
| --- | --- | --- |
| `servidor.arranque` | info | Arranque de una instancia; indica que variables estan definidas |
| `config.falta_*` | error | Falta `APP_PASSWORD` o `DATABASE_URL` en el entorno |
| `login.sin_configuracion` | error | Se intento entrar sin `APP_PASSWORD` configurada |
| `login.contrasena_incorrecta` | warn | Password incorrecta (solo longitudes, nunca el valor) |
| `login.ok` / `logout.ok` | info | Inicio y cierre de sesion |
| `auth.sin_secreto` / `auth.cookie_invalida` | error / warn | El proxy rechazo la sesion |
| `accion.<nombre>.fallo` | warn / error | Fallo en una server action (`faltan_migraciones`, `sin_conexion_bd`, ...) |
| `entrada.*`, `importacion.*` | info / warn | Guardado, borrado e importacion de registros |
| `*.lento` | warn | Consulta a BD de 1 s o mas |
| `request.error` | error | Error no controlado en render, ruta, accion o proxy |
| `cliente.error` | error | Error de JavaScript en el navegador |
| `health.*` | warn / error | `/api/health` detecto un problema |

Para ver tambien los eventos `debug` define `LOG_LEVEL=debug` en Vercel y haz Redeploy.
