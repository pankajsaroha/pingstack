import { Sidebar } from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-6xl mx-auto p-10 mt-2 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
