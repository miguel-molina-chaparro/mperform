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
5. Crea las tablas en la base de datos de produccion (una vez, y tras cada migracion nueva):

   ```bash
   DATABASE_URL="<url de produccion>" npx prisma migrate deploy
   ```

   Con Neon/Vercel Postgres usa la URL **sin pooling** (`DATABASE_URL_UNPOOLED` o
   `POSTGRES_URL_NON_POOLING`) para las migraciones.

## Diagnostico

`GET /api/health` es publico y devuelve, sin exponer valores, si `APP_PASSWORD`,
`APP_SESSION_SECRET` y `DATABASE_URL` estan definidas y si la base de datos responde.
Si indica `P2021`, faltan las migraciones.
