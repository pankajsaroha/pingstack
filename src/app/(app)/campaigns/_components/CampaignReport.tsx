'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';

interface CampaignReportProps {
  campaign: any;
  onClose: () => void;
}

export default function CampaignReport({ campaign, onClose }: CampaignReportProps) {
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState('');

  const fetchReportData = async (campaignId: string) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/report`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error('Report fetch failed:', e);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (campaign?.id) {
      fetchReportData(campaign.id);
    }
  }, [campaign?.id]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[85vh] overflow-hidden relative animate-in zoom-in-95 duration-300">
        <div className="p-6 sm:p-8 border-b border-glass-border flex items-center justify-between bg-glass-card/10 text-left">
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight">{campaign.name}</h3>
            <p className="text-[9px] text-fg/30 font-black uppercase tracking-widest mt-1.5">Delivery Status Metrics Logs</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-glass-input rounded-xl transition-colors cursor-pointer text-muted hover:text-fg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-glass-card/20 border-b border-glass-border text-left">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/20" />
              <input
                type="text"
                placeholder="Search recipients name or phone..."
                className="w-full pl-12 pr-4 py-3 bg-glass-input border border-glass-border rounded-2xl text-xs font-semibold focus:bg-white/10 focus:border-indigo-500 focus:outline-none transition-all text-fg placeholder:text-fg/25"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
              />
            </div>
            <button className="px-6 py-3 bg-glass-input hover:bg-white/10 border border-glass-border text-fg rounded-2xl text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer">
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar text-left">
          {reportLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Compiling statistics...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <p className="text-xs font-black uppercase tracking-widest">No logs recorded yet</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-glass-card/85 border-b border-glass-border z-10">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-muted uppercase tracking-widest">Recipient</th>
                  <th className="px-6 py-4 text-[9px] font-black text-muted uppercase tracking-widest">Phone</th>
                  <th className="px-6 py-4 text-[9px] font-black text-muted uppercase tracking-widest">Variables</th>
                  <th className="px-6 py-4 text-[9px] font-black text-muted uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[9px] font-black text-muted uppercase tracking-widest text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportData
                  .filter(r =>
                    (r.contacts?.name || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                    (r.phone_number || '').includes(reportSearch)
                  )
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-glass-card transition-colors">
                      <td className="px-6 py-4 font-bold text-fg text-sm">
                        {row.contacts?.name || (row.variables?.length > 0 ? (row.variables[0] || 'Unknown') : 'Customer')}
                      </td>
                      <td className="px-6 py-4 text-xs text-fg/50 font-semibold font-mono tracking-tight">{row.phone_number}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {row.variables?.map((v: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-glass-input text-fg/50 rounded-lg text-[8px] font-black uppercase border border-glass-border">
                              v{i+1}: {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                          row.status === 'read' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                          row.status === 'delivered' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                          row.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                          'bg-glass-input border-glass-border text-fg/50'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[10px] text-fg/30 font-semibold font-mono">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-glass-border bg-glass-card/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg"
          >
            Close Logs
          </button>
        </div>
      </div>
    </div>
  );
}
