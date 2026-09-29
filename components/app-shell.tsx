"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BarChart3, Lightbulb, FileUp, LogOut } from "lucide-react";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { reportarErrorCliente } from "@/lib/reportar-error-cliente";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/sugerencias", label: "Sugerencias", icon: Lightbulb },
  { href: "/importar-exportar", label: "Importar/Exportar", icon: FileUp },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const showProtectedNav = pathname !== "/login";

  const onLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction();
        router.replace("/login");
        router.refresh();
      } catch (error) {
        reportarErrorCliente("accion.logout", error);
        toast.error("No se pudo cerrar sesión");
      }
    });
  };

  return (
    <>
      {showProtectedNav ? (
        <>
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
            <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
              <nav className="hidden items-center gap-2 md:flex">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                        isActive(pathname, item.href)
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <p className="text-sm font-semibold md:hidden">Mperform</p>

              <Button variant="outline" size="sm" onClick={onLogout} disabled={pending}>
                <LogOut className="mr-1 size-4" />
                {pending ? "Saliendo..." : "Cerrar sesión"}
              </Button>
            </div>
          </header>

          <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[max(env(safe-area-inset-bottom),0px)] backdrop-blur md:hidden">
            <div className="grid grid-cols-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-2 text-[11px]",
                      isActive(pathname, item.href) ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      ) : null}

      <div className={cn(showProtectedNav && "pb-16 md:pb-0")}>{children}</div>
      <Toaster />
    </>
  );
}
