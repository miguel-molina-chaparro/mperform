import { Skeleton } from "@/components/ui/skeleton";

export default function SugerenciasLoading() {
  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-56" />
    </main>
  );
}
