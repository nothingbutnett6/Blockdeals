import React, { useEffect, useState } from 'react';

interface TickerProps {
  totalValue: number;
}

export const Ticker: React.FC<TickerProps> = ({ totalValue }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Simple count-up animation
    let start = 0;
    const duration = 2000;
    const increment = totalValue / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= totalValue) {
        setDisplayValue(totalValue);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [totalValue]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-terminal-card border-b border-terminal-border">
      <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2 font-mono">Total Deal Value Tracked</h2>
      <div className="text-4xl md:text-5xl font-mono font-bold text-accent-blue tabular-nums">
        ₹{displayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} Cr
      </div>
      <p className="text-xs text-gray-600 mt-2 font-mono">Since 2024-01-01</p>
    </div>
  );
};