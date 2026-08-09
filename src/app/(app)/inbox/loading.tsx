export default function InboxLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-bg animate-pulse">
      {/* Sidebar Thread List Skeleton */}
      <div className="w-80 sm:w-96 border-r border-glass-border p-4 space-y-4 flex flex-col shrink-0">
        <div className="h-10 w-full bg-fg/10 rounded-xl" />
        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-3 bg-glass-card/40 border border-glass-border/30 rounded-xl flex items-center space-x-3">
              <div className="h-10 w-10 bg-fg/10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-fg/10 rounded" />
                  <div className="h-3 w-10 bg-fg/5 rounded" />
                </div>
                <div className="h-3 w-3/4 bg-fg/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Thread Skeleton */}
      <div className="flex-1 flex flex-col justify-between p-6">
        <div className="flex items-center space-x-4 border-b border-glass-border pb-4">
          <div className="h-10 w-10 bg-fg/10 rounded-full" />
          <div className="space-y-2">
            <div className="h-5 w-36 bg-fg/10 rounded" />
            <div className="h-3 w-20 bg-fg/5 rounded" />
          </div>
        </div>
        <div className="space-y-4 my-auto py-8">
          <div className="h-12 w-64 bg-fg/10 rounded-2xl rounded-bl-none self-start" />
          <div className="h-16 w-80 bg-fg/15 rounded-2xl rounded-br-none ml-auto" />
          <div className="h-10 w-48 bg-fg/10 rounded-2xl rounded-bl-none self-start" />
        </div>
        <div className="h-14 w-full bg-glass-card border border-glass-border rounded-2xl" />
      </div>
    </div>
  );
}
