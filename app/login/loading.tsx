import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="w-full space-y-4 rounded-xl border p-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </main>
  );
}
