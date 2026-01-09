import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-terminal-bg/95 backdrop-blur border-b border-terminal-border shadow-lg">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-xl rounded-sm">
            B
          </div>
          <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
            BlockDeals<span className="text-gray-500">India</span>
          </h1>
        </div>
        
        <nav className="hidden md:flex gap-6 text-sm font-mono text-gray-400">
          <a href="#" className="hover:text-white transition-colors">About</a>
          <a href="#" className="hover:text-white transition-colors">Glossary</a>
          <a href="#" className="hover:text-white transition-colors text-accent-blue">Submit Deal</a>
        </nav>
        
        {/* Mobile Menu Icon (Placeholder) */}
        <button className="md:hidden text-gray-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};