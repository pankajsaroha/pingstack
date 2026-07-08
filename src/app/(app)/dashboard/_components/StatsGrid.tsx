'use client';

interface StatsGridProps {
  stats: {
    conversations: number;
    templatesApproved: number;
    inboundMessages: number;
  };
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {[
        { label: 'Total Conversations', value: stats.conversations },
        { label: 'Meta Templates Approved', value: stats.templatesApproved },
        { label: 'Inbound Logged Messages', value: stats.inboundMessages }
      ].map((stat, i) => (
        <div key={i} className="bg-glass-card border border-glass-border p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
          <h3 className="text-[9px] font-black text-fg/30 uppercase tracking-[0.2em] mb-4">{stat.label}</h3>
          <p className="text-4xl font-black text-fg tracking-tighter">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
