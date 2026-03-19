export default function Dashboard() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Workspace Dashboard</h1>
          <p className="text-gray-500 mt-1">Here's an overview of your messaging activities today.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
          <h3 className="text-sm font-medium text-gray-500">Total Contacts</h3>
          <p className="mt-3 text-4xl font-bold text-gray-900">12,400</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
          <h3 className="text-sm font-medium text-gray-500">Active Campaigns</h3>
          <p className="mt-3 text-4xl font-bold text-gray-900">4</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
          <h3 className="text-sm font-medium text-gray-500">Messages Sent</h3>
          <p className="mt-3 text-4xl font-bold text-gray-900">89.2k</p>
        </div>
      </div>
      
      <div className="mt-8 bg-white/80 backdrop-blur-md p-10 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-h-[350px] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bgGradient rounded-2xl flex items-center justify-center mb-5 bg-gray-900 shadow-md">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Welcome to PingStack</h3>
        <p className="text-gray-500 text-[15px] mt-2 max-w-md">Your workspace is successfully set up. Use the sidebar to manage your contacts and begin pushing WhatsApp campaigns through the BullMQ queue.</p>
        <button className="mt-6 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-sm">
          Get Started Docs
        </button>
      </div>
    </div>
  );
}
