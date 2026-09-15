-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."DailyEntry" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "rendimientoTrabajo" DOUBLE PRECISION NOT NULL,
    "movil17" BOOLEAN NOT NULL,
    "movilResto" BOOLEAN NOT NULL,
    "np" BOOLEAN NOT NULL,
    "ejercicio" BOOLEAN NOT NULL,
    "formacion" BOOLEAN NOT NULL,
    "leer" BOOLEAN NOT NULL,
    "social" BOOLEAN NOT NULL,
    "nf" INTEGER NOT NULL DEFAULT 1,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_fecha_key" ON "public"."DailyEntry"("fecha");

