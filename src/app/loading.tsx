import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div role="status" aria-label="Loading page">
        <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    </main>
  );
}