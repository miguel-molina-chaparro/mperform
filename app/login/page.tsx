import { redirect } from "next/navigation";
import { Zap } from "lucide-react";

import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { haySesionValida } from "@/lib/auth-session";
import { rutaSegura } from "@/lib/session-token";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const destino = rutaSegura(Array.isArray(next) ? next[0] : next);

  if (await haySesionValida()) {
    redirect(destino);
  }

  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="bg-brand-gradient grid size-16 place-items-center rounded-2xl text-white shadow-[0_16px_36px_-12px_var(--brand)]">
          <Zap className="size-8" fill="currentColor" />
        </span>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            M<span className="text-brand-gradient">perform</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu seguimiento diario de rendimiento y hábitos
          </p>
        </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm next={destino} />
        </CardContent>
      </Card>
    </main>
  );
}
