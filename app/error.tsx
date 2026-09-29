"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="container mx-auto max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            No se pudieron cargar los datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Suele deberse a que la base de datos no está accesible o a que faltan las
            migraciones. Puedes revisar el estado en{" "}
            <a className="underline" href="/api/health">
              /api/health
            </a>
            .
          </p>
          {error.digest ? <p className="font-mono text-xs">Ref: {error.digest}</p> : null}
          <Button onClick={() => retry()}>Reintentar</Button>
        </CardContent>
      </Card>
    </main>
  );
}
