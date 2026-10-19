export default function RouteLoading() {
  return (
    <div
      role="status"
      aria-label="Загрузка раздела"
      className="space-y-6 animate-pulse"
    >
      <span className="sr-only">Загрузка раздела…</span>
      <div className="h-8 w-64 max-w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-96 max-w-full rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-40 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        <div className="h-40 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        <div className="h-40 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        <div className="h-40 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
