"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportarErrorCliente } from "@/lib/reportar-error-cliente";

export function LoginForm({ next }: { next?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        // Si es correcta, la accion redirige desde el servidor y no devuelve nada.
        const result = await loginAction(password, next);
        if (result && !result.ok) {
          setError(result.message);
          toast.error(result.message);
        }
      } catch (err) {
        unstable_rethrow(err);
        reportarErrorCliente("accion.login", err);
        const message = "No se pudo contactar con el servidor. Inténtalo de nuevo.";
        setError(message);
        toast.error(message);
      }
    });
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Introduce tu contraseña"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
          required
        />
        {error ? (
          <p id="login-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending || !password}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
