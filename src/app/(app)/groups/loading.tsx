export default function GroupsLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-fg/10 rounded-xl" />
          <div className="h-4 w-56 bg-fg/5 rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-fg/10 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-6 bg-glass-card border border-glass-border rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-5 w-28 bg-fg/10 rounded" />
              <div className="h-6 w-14 bg-fg/10 rounded-full" />
            </div>
            <div className="h-4 w-36 bg-fg/5 rounded" />
            <div className="pt-2 flex justify-end">
              <div className="h-8 w-8 bg-fg/10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
