export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-fg/10 rounded-xl" />
          <div className="h-4 w-64 bg-fg/5 rounded-lg" />
        </div>
        <div className="h-10 w-36 bg-fg/10 rounded-xl" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 bg-glass-card border border-glass-border rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-fg/10 rounded-md" />
              <div className="h-8 w-8 bg-fg/10 rounded-xl" />
            </div>
            <div className="h-8 w-20 bg-fg/15 rounded-lg" />
            <div className="h-3 w-32 bg-fg/5 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 bg-glass-card border border-glass-border rounded-2xl space-y-6">
          <div className="h-6 w-36 bg-fg/10 rounded-lg" />
          <div className="h-64 w-full bg-fg/5 rounded-xl" />
        </div>
        <div className="p-6 bg-glass-card border border-glass-border rounded-2xl space-y-6">
          <div className="h-6 w-28 bg-fg/10 rounded-lg" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-fg/10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full bg-fg/10 rounded" />
                  <div className="h-3 w-2/3 bg-fg/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
