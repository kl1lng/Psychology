import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-zinc-800/80 rounded-xl ${className}`}
      {...props}
    />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-[#c7c4d8]/30 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col gap-3 relative overflow-hidden">
      <div className="flex justify-between items-start">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-12 h-5 rounded-md" />
      </div>
      <div className="mt-1 space-y-2">
        <Skeleton className="w-24 h-3.5" />
        <Skeleton className="w-16 h-8" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-[#c7c4d8]/20">
      <td className="py-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="w-32 h-3.5" />
            <Skeleton className="w-44 h-2.5" />
          </div>
        </div>
      </td>
      <td className="py-3 px-4 sm:px-6">
        <Skeleton className="w-16 h-5 rounded-md" />
      </td>
      <td className="py-3 px-4 sm:px-6">
        <Skeleton className="w-28 h-4 rounded" />
      </td>
      <td className="py-3 px-4 sm:px-6 text-right">
        <div className="flex justify-end">
          <Skeleton className="w-7 h-7 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

export function DeptItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
      <div className="space-y-1.5 flex-1 pr-3">
        <Skeleton className="w-40 h-3.5" />
        <Skeleton className="w-20 h-4 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-16 h-5 rounded-full" />
        <Skeleton className="w-6 h-6 rounded" />
      </div>
    </div>
  );
}
