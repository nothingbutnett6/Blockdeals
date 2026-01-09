import React from 'react';
import { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: any) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange }) => {
  return (
    <div className="bg-terminal-card border border-terminal-border p-4 rounded-lg sticky top-24">
      <h3 className="text-white font-bold mb-4 font-mono text-sm uppercase border-b border-gray-700 pb-2">Filters</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-mono">Search Ticker/Company</label>
          <input 
            type="text" 
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="e.g. PAYTM"
            className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded focus:border-accent-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1 font-mono">Min Value (₹ Cr)</label>
          <input 
            type="range" 
            min="0" 
            max="1000" 
            step="10"
            value={filters.minValue}
            onChange={(e) => onFilterChange('minValue', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <div className="text-right text-xs text-accent-blue font-mono mt-1">
            ≥ ₹{filters.minValue} Cr
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
           <div className="text-xs text-gray-500 mb-2 font-mono">Legend</div>
           <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
             <div className="w-3 h-3 rounded-full bg-accent-green"></div> Buy / Promoter Entry
           </div>
           <div className="flex items-center gap-2 text-xs text-gray-400">
             <div className="w-3 h-3 rounded-full bg-accent-red"></div> Sell / Exit
           </div>
        </div>
      </div>
    </div>
  );
};