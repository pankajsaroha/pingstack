'use client';

import { Book, Shield, Zap, Search, ChevronRight } from 'lucide-react';

const categories = [
  {
    title: 'Getting Started',
    icon: Zap,
    articles: ['Manual Connectivity Guide', 'Testing your implementation', 'Plan limits overview']
  },
  {
    title: 'Messaging API',
    icon: Book,
    articles: ['Sending your first campaign', 'Template variables guide', 'Handling delivery status']
  },
  {
    title: 'Billing & Security',
    icon: Shield,
    articles: ['Refund Policy', 'Managing subscriptions', 'Data Encryption policy']
  }
];

export default function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20">
      <div className="mb-16">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">Documentation</h2>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">How can we help you?</h1>
        <div className="relative group max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
          <input 
            type="text" 
            placeholder="Search for articles, guides..." 
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {categories.map((cat) => (
          <div key={cat.title} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <cat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-6">{cat.title}</h3>
            <ul className="space-y-4">
              {cat.articles.map((article) => (
                <li key={article}>
                  <a href="#" className="flex items-center text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors group">
                    {article}
                    <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-20 p-12 bg-gray-900 rounded-[3rem] text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <h2 className="text-3xl font-black text-white relative z-10">Still have questions?</h2>
        <p className="text-gray-400 mt-4 relative z-10 max-w-xl mx-auto font-medium">
          Our specialized team is available 24/7 to help you with your enterprise infrastructure.
        </p>
        <button className="mt-10 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-500 transition-all shadow-xl active:scale-95 transform translate-y-0 hover:-translate-y-1 relative z-10">
          Contact Support
        </button>
      </div>
    </div>
  );
}
