import React, { useState } from 'react';
import { BlockDeal, DealType } from '../types';
import { analyzeDeal } from '../services/geminiService';

interface TimelineEntryProps {
  deal: BlockDeal;
  isLast: boolean;
}

export const TimelineEntry: React.FC<TimelineEntryProps> = ({ deal, isLast }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (analysis) return; // Already analyzed
    setLoading(true);
    const result = await analyzeDeal(deal);
    setAnalysis(result);
    setLoading(false);
  };

  const isBuy = deal.direction === DealType.BUY;
  
  return (
    <div className="relative pl-8 md:pl-12 py-6 group">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[11px] md:left-[15px] top-8 bottom-0 w-0.5 bg-terminal-border group-hover:bg-gray-600 transition-colors"></div>
      )}
      
      {/* Timeline Dot */}
      <div className={`absolute left-0 md:left-1 top-8 w-6 h-6 rounded-full border-4 border-terminal-bg ${isBuy ? 'bg-accent-green' : 'bg-accent-red'} z-10 shadow-lg shadow-black/50`}></div>

      {/* Date Label (Mobile: above, Desktop: side) */}
      <div className="md:absolute md:-left-32 md:top-8 md:text-right md:w-28 mb-2 md:mb-0">
        <span className="font-mono text-sm text-gray-400">{deal.date}</span>
      </div>

      {/* Card Content */}
      <div className="bg-terminal-card border border-terminal-border p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 gap-2">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {deal.stock.name} <span className="text-gray-500 font-normal text-base">({deal.stock.symbol})</span>
            </h3>
            <div className="flex gap-2 mt-1 flex-wrap">
              {deal.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700 font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="text-left md:text-right font-mono">
             <div className={`text-lg font-bold ${isBuy ? 'text-accent-green' : 'text-accent-red'}`}>
               {deal.dealType}
             </div>
             <div className="text-white">{deal.amountDisplay}</div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400 mb-4 bg-black/20 p-3 rounded font-mono">
          <div>
            <span className="block text-gray-600 text-xs uppercase">Seller</span>
            <span className="text-white">{deal.seller || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-gray-600 text-xs uppercase">Buyer</span>
            <span className="text-white">{deal.buyer || 'N/A'}</span>
          </div>
        </div>

        {/* Description */}
        <div 
          className="text-gray-300 leading-relaxed text-sm md:text-base mb-4"
          dangerouslySetInnerHTML={{ __html: deal.body }}
        />

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 border-t border-terminal-border pt-3">
           <button 
             onClick={handleAnalyze}
             disabled={loading}
             className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs uppercase tracking-wider font-bold text-accent-blue rounded transition-colors disabled:opacity-50"
           >
             {loading ? (
                <span className="animate-pulse">Analyzing...</span>
             ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {analysis ? 'Re-Analyze' : 'AI Insight'}
                </>
             )}
           </button>
           
           {deal.sources.length > 0 && (
             <a href={deal.sources[0].url} className="text-xs text-gray-500 hover:text-white underline decoration-gray-700">
               Source
             </a>
           )}
        </div>

        {/* AI Analysis Result */}
        {analysis && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded text-sm text-blue-200 font-mono animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-1 text-accent-blue text-xs uppercase font-bold">
              <span>Gemini Analysis</span>
            </div>
            {analysis}
          </div>
        )}

      </div>
    </div>
  );
};
