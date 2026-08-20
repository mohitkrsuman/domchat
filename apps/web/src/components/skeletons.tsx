"use client";

import { Skeleton } from "@/components/ui";

export function SessionsListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading sessions">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="mt-8 space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
