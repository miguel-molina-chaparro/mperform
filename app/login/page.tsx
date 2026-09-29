import { redirect } from "next/navigation";

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
    <main className="container mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm next={destino} />
        </CardContent>
      </Card>
    </main>
  );
}
