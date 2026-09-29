import { Skeleton } from "@/components/ui/skeleton";

export default function ImportarExportarLoading() {
  return (
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-80" />
    </main>
  );
}
