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
