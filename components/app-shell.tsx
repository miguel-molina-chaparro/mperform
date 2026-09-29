"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileUp,
  Home,
  Lightbulb,
  LogOut,
  Moon,
  Sun,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
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

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="bg-brand-gradient grid size-9 place-items-center rounded-xl text-white shadow-[0_8px_20px_-8px_var(--brand)]">
        <Zap className="size-5" fill="currentColor" />
      </span>
      <span className="font-heading text-lg font-bold tracking-tight">
        M<span className="text-brand-gradient">perform</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cambiar tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
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
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
            <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
              <Logo />

              <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 md:flex">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                        active
                          ? "bg-brand-gradient text-white shadow-[0_6px_16px_-8px_var(--brand)]"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={onLogout} disabled={pending}>
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">
                    {pending ? "Saliendo..." : "Cerrar sesión"}
                  </span>
                </Button>
              </div>
            </div>
          </header>

          <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-border/60 bg-background/80 pb-[max(env(safe-area-inset-bottom),0px)] shadow-lg backdrop-blur-xl md:hidden">
            <div className="grid grid-cols-4 p-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                      active ? "bg-brand-gradient text-white" : "text-muted-foreground",
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

      <div className={cn(showProtectedNav && "pb-24 md:pb-0")}>{children}</div>
      <Toaster />
    </>
  );
}
