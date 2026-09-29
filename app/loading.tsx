import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </main>
  );
}
