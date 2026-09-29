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
- `APP_SESSION_SECRET` (recomendada): clave para firmar la cookie de sesion.

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
4. Lanza un deploy.
5. Ejecuta migraciones en produccion con:
   - `vercel env pull .env.production` (opcional para correr localmente contra prod).
   - `npx prisma migrate deploy` usando la `DATABASE_URL` de produccion.
