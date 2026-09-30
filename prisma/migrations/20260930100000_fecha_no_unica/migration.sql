-- Se permiten varios registros con la misma fecha (la app los marca como repetidos).
DROP INDEX "public"."DailyEntry_fecha_key";

-- CreateIndex
CREATE INDEX "DailyEntry_fecha_idx" ON "public"."DailyEntry"("fecha");
