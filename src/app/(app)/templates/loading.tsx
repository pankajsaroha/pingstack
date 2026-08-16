export default function TemplatesLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-fg/10 rounded-xl" />
          <div className="h-4 w-72 bg-fg/5 rounded-lg" />
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-28 bg-fg/10 rounded-xl" />
          <div className="h-10 w-36 bg-fg/10 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-6 bg-glass-card border border-glass-border rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-5 w-32 bg-fg/10 rounded" />
              <div className="h-6 w-20 bg-fg/10 rounded-full" />
            </div>
            <div className="h-16 w-full bg-fg/5 rounded-xl" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-3 w-16 bg-fg/5 rounded" />
              <div className="h-3 w-24 bg-fg/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
