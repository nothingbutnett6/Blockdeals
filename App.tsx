import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DEAL_TYPES, GLOSSARY } from './data/deals';
import { BlockDeal } from './types';
import { fetchRealtimeDeals } from './services/geminiService';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function BlockDealsIndia() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState("timeline"); // timeline, leaderboard, glossary, about
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [showSettings, setShowSettings] = useState(false);
  const [counterMode, setCounterMode] = useState("up"); // up or down
  const [runningTotal, setRunningTotal] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Data State - Initialize empty, fetch live only
  const [deals, setDeals] = useState<BlockDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);

  // Fetch real-time data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const liveDeals = await fetchRealtimeDeals();
        if (liveDeals && liveDeals.length > 0) {
          setDeals(liveDeals);
          setIsLiveData(true);
        } else {
            console.warn("No deals returned from Gemini");
        }
      } catch (err) {
          console.error("Error fetching deals", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate total institutional money moved
  const totalAmount = useMemo(() => {
    return deals.reduce((sum, deal) => sum + deal.amount, 0);
  }, [deals]);

  // Filter deals
  const filteredDeals = useMemo(() => {
    let d = [...deals];
    
    if (activeFilter !== "all") {
      d = d.filter(item => {
          // Normalize deal type matching (e.g. handle 'fii-entry' vs 'FII Entry')
          const type = item.dealType.toLowerCase().replace(/\s+/g, '-');
          return type.includes(activeFilter.toLowerCase()) || activeFilter === type;
      });
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      d = d.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.stock.symbol.toLowerCase().includes(query) ||
        item.stock.name.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query)
      );
    }
    
    return d;
  }, [activeFilter, searchQuery, deals]);

  // Scroll-based counter animation
  useEffect(() => {
    if (currentPage !== "timeline" || !timelineRef.current) return;

    const handleScroll = () => {
      const entries = timelineRef.current?.querySelectorAll('.deal-entry');
      if (!entries) return;
      
      let visibleAmount = 0;

      entries.forEach((entry, index) => {
        const rect = entry.getBoundingClientRect();
        // If element is somewhat near top or above
        const isVisible = rect.top < window.innerHeight * 0.8;
        
        if (isVisible && filteredDeals[index]) {
          visibleAmount += filteredDeals[index].amount;
        }
      });

      if (counterMode === "up") {
        setRunningTotal(visibleAmount);
      } else {
        setRunningTotal(totalAmount - visibleAmount);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, filteredDeals, counterMode, totalAmount]);

  // Format large numbers in Indian style
  const formatIndianCurrency = (paise: number) => {
    const rupees = paise / 100;
    if (rupees >= 10000000) {
      return `₹${(rupees / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
    } else if (rupees >= 100000) {
      return `₹${(rupees / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} L`;
    }
    return `₹${rupees.toLocaleString('en-IN')}`;
  };
  
  const formatQuantity = (qty?: number) => {
      if (!qty) return "";
      if (qty >= 10000000) return `${(qty / 10000000).toFixed(2)} Cr shares`;
      if (qty >= 100000) return `${(qty / 100000).toFixed(2)} L shares`;
      return `${qty.toLocaleString()} shares`;
  };

  // Format date nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate(),
      full: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-[#faf7f2] text-zinc-900'}`}>
      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-50 mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`
      }} />

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${darkMode ? 'bg-zinc-950/90 border-zinc-800' : 'bg-[#faf7f2]/90 border-zinc-200'}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage("timeline")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-rose-500/20">
              🐘
            </div>
            <div>
              <h1 className="font-serif text-xl tracking-tight">
                Block Deals <span className="text-rose-500">India</span>
              </h1>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-mono tracking-tight">
            {[
              { key: "timeline", label: "Timeline" },
              { key: "leaderboard", label: "Leaderboard" },
              { key: "glossary", label: "Glossary" },
              { key: "about", label: "About" }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key)}
                className={`relative py-1 transition-colors ${
                  currentPage === item.key 
                    ? 'text-rose-500 font-bold' 
                    : darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {item.label}
                {currentPage === item.key && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
              title="Toggle Theme"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>

            {/* Settings Panel */}
            {showSettings && (
              <div className={`absolute right-0 top-full mt-2 p-4 rounded-xl shadow-xl border w-64 z-50 ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                <h3 className="font-medium mb-3 text-sm uppercase tracking-wider opacity-70">Settings</h3>
                <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={counterMode === "down"}
                    onChange={(e) => setCounterMode(e.target.checked ? "down" : "up")}
                    className="rounded mt-1 accent-rose-500"
                  />
                  <div>
                    <span className="block font-medium">Subtract Mode</span>
                    <span className="text-xs opacity-70">Start at total and count down as you scroll</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {currentPage === "timeline" && (
          <>
            <TimelinePage
              deals={filteredDeals}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              runningTotal={runningTotal}
              totalAmount={totalAmount}
              counterMode={counterMode}
              darkMode={darkMode}
              formatIndianCurrency={formatIndianCurrency}
              formatQuantity={formatQuantity}
              formatDate={formatDate}
              timelineRef={timelineRef}
              loading={loading}
              isLiveData={isLiveData}
            />
            {/* Sticky Box for Money Moved */}
            <div className="fixed bottom-6 left-6 z-50 animate-bounce-in">
              <div className={`backdrop-blur-md border shadow-2xl rounded-xl p-5 min-w-[220px] transition-colors duration-300 ${
                darkMode 
                  ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' 
                  : 'bg-white/90 border-zinc-200 text-zinc-900'
              }`}>
                <div className="text-xs uppercase tracking-wider opacity-60 mb-1 font-mono">
                  {counterMode === 'up' ? 'Money Moved So Far' : 'Remaining To Track'}
                </div>
                <div className="font-mono text-3xl font-bold text-rose-500 tabular-nums leading-none mb-2">
                   {formatIndianCurrency(runningTotal)}
                </div>
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                   <div 
                     className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300 ease-out" 
                     style={{ width: `${Math.min((runningTotal / (totalAmount || 1)) * 100, 100)}%`}}
                   />
                </div>
                {isLiveData && (
                  <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Updates Active
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {currentPage === "leaderboard" && (
          <LeaderboardPage
            deals={deals}
            darkMode={darkMode}
            formatIndianCurrency={formatIndianCurrency}
          />
        )}
        {currentPage === "glossary" && (
          <GlossaryPage darkMode={darkMode} />
        )}
        {currentPage === "about" && (
          <AboutPage darkMode={darkMode} />
        )}
      </main>

      {/* Footer */}
      <footer className={`mt-16 py-12 border-t ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-900 text-white'}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-serif text-lg mb-3 text-white">Block Deals India</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Tracking where the smart money goes in Indian markets. Not investment advice—just an attempt to make the opaque slightly more transparent.
              </p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Resources</h4>
              <div className="space-y-2 text-sm">
                <button onClick={() => setCurrentPage('glossary')} className="block text-zinc-400 hover:text-white transition-colors">What is a Block Deal?</button>
                <a href="#" className="block text-zinc-400 hover:text-white transition-colors">SEBI Regulations</a>
                <a href="#" className="block text-zinc-400 hover:text-white transition-colors">API Documentation</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Connect</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-zinc-400 hover:text-white transition-colors">Twitter/X</a>
                <a href="#" className="block text-zinc-400 hover:text-white transition-colors">Newsletter</a>
                <a href="#" className="block text-zinc-400 hover:text-white transition-colors">Submit Tip</a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-800 text-center text-xs text-zinc-500">
            <p>Data sourced from NSE and BSE. Built with 🐘 by someone who got tired of reading exchange filings.</p>
            <p className="mt-1">© 2025 Block Deals India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// TIMELINE PAGE COMPONENT
// ============================================================================

function TimelinePage({ 
  deals, activeFilter, setActiveFilter, searchQuery, setSearchQuery,
  runningTotal, totalAmount, counterMode, darkMode, formatIndianCurrency, formatQuantity, formatDate, timelineRef, loading, isLiveData
}: any) {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-3">
            <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-4">
              Following the <em className="text-rose-500 not-italic">Smart Money</em> in Indian Markets
            </h2>
            <p className={`text-lg leading-relaxed max-w-2xl ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              A chronicle of block deals, bulk deals, and significant stake changes on NSE and BSE. 
              Because when ₹500 crore moves in a single trade, someone knows something you don't.
            </p>
            <div className="flex flex-wrap gap-4 mt-6 text-sm">
              <span className={`flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                {isLiveData ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> : <span>📅</span>}
                {isLiveData ? "Live Data Connected" : "Updated Daily"}
              </span>
              <span className={`flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                <span>📊</span> NSE & BSE Data
              </span>
              <span className={`flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                <span>💬</span> With Commentary
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === "all"
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                : darkMode 
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
            }`}
          >
            All Deals
          </button>
          {Object.entries(DEAL_TYPES).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeFilter === key
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                  : darkMode 
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              <span>{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by stock, company, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full max-w-md px-4 py-2.5 pl-10 rounded-xl text-sm transition-colors ${
              darkMode 
                ? 'bg-zinc-800 border-zinc-700 focus:border-rose-500 placeholder-zinc-500'
                : 'bg-white border border-zinc-200 focus:border-rose-500 placeholder-zinc-400'
            } focus:outline-none focus:ring-2 focus:ring-rose-500/20`}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-6xl mx-auto px-4 pb-16" ref={timelineRef}>
        <div className={`flex items-center justify-between pb-4 mb-8 border-b-2 ${darkMode ? 'border-zinc-700' : 'border-zinc-900'}`}>
          <h3 className="font-serif text-xl">
             {isLiveData ? "Live Feed" : "Recent Block Deals"}
          </h3>
          <span className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {loading ? "Fetching latest..." : `${deals.length} entries`}
          </span>
        </div>

        {loading && (
           <div className="py-20 text-center">
             <div className="inline-block w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-zinc-500 text-lg">Scanning NSE/BSE feeds for major block deals...</p>
             <p className="text-zinc-600 text-sm mt-2">Powered by Gemini AI</p>
           </div>
        )}

        <div className="space-y-6">
          {deals.map((deal: BlockDeal, index: number) => (
            <DealEntry 
              key={deal.id} 
              deal={deal} 
              darkMode={darkMode}
              formatDate={formatDate}
              formatQuantity={formatQuantity}
              index={index}
            />
          ))}
        </div>

        {!loading && deals.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className={darkMode ? 'text-zinc-500' : 'text-zinc-500'}>
              No deals found. The market might be sleeping.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

// ============================================================================
// DEAL ENTRY COMPONENT
// ============================================================================

function DealEntry({ deal, darkMode, formatDate, formatQuantity, index }: any) {
  const dateInfo = formatDate(deal.date);
  
  // Safe fallback if dealType from live data doesn't match standard keys exactly
  let dealConfig = DEAL_TYPES[deal.dealType];
  if (!dealConfig) {
     // Try to find a partial match
     const match = Object.keys(DEAL_TYPES).find(key => deal.dealType.includes(key));
     dealConfig = match ? DEAL_TYPES[match] : DEAL_TYPES["block-transfer"];
  }

  return (
    <article 
      className="deal-entry grid grid-cols-[70px_50px_1fr] md:grid-cols-[100px_60px_1fr] gap-3 md:gap-6"
      style={{ 
        animation: `fadeInUp 0.5s ease ${index * 0.1}s forwards`,
        opacity: 0
      }}
    >
      {/* Date */}
      <div className="text-right pt-4">
        <div className={`text-xs uppercase tracking-wider ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
          {dateInfo.month}
        </div>
        <div className="font-serif text-2xl md:text-3xl">{dateInfo.day}</div>
      </div>

      {/* Icon & Line */}
      <div className="flex flex-col items-center pt-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br ${dealConfig.bgGradient} text-black/80 shadow-sm`}>
          {dealConfig.icon}
        </div>
        <div className={`w-0.5 flex-grow mt-3 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      </div>

      {/* Card */}
      <div className={`rounded-2xl p-5 transition-all hover:shadow-xl ${
        darkMode 
          ? 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700' 
          : 'bg-white border border-zinc-100 shadow-md hover:shadow-lg'
      }`}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-sm px-2 py-0.5 rounded font-bold ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
              {deal.stock.symbol}
            </span>
            <span className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {deal.stock.name}
            </span>
          </div>
          <div className="text-right">
            <div className={`font-mono text-lg font-semibold ${
              deal.direction === "buy" ? "text-emerald-500" : 
              deal.direction === "sell" ? "text-rose-500" : 
              darkMode ? "text-zinc-300" : "text-zinc-700"
            }`}>
              {deal.amountDisplay}
            </div>
            {/* Quantity and Price Info */}
            <div className={`text-xs font-mono mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {formatQuantity(deal.quantity)} {deal.price ? `@ ₹${deal.price.toLocaleString()}` : ''}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-serif text-xl leading-snug mb-3">{deal.title}</h3>

        {/* Body */}
        <div 
          className={`text-sm leading-relaxed mb-4 prose ${darkMode ? 'prose-invert text-zinc-400' : 'text-zinc-600'}`}
          dangerouslySetInnerHTML={{ __html: deal.body }}
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
          <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black">
            {dealConfig.label}
          </span>
          {deal.tags.map((tag: string) => (
            <span 
              key={tag} 
              className={`text-xs px-2.5 py-1 rounded-full ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Sources */}
        <div className={`mt-4 pt-3 border-t border-dashed ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className={`text-xs uppercase tracking-wider mb-2 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Sources
          </div>
          <div className="flex flex-wrap gap-3">
            {deal.sources.map((source: any, i: number) => (
              <a 
                key={i}
                href={source.url}
                className="text-sm text-rose-500 hover:text-rose-600 flex items-center gap-1"
              >
                <span className="opacity-50">→</span>
                {source.name}
              </a>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
           0% { transform: scale(0.9); opacity: 0; }
           100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
           animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </article>
  );
}

// ============================================================================
// LEADERBOARD PAGE
// ============================================================================

function LeaderboardPage({ deals, darkMode, formatIndianCurrency }: any) {
  const sortedDeals = useMemo(() => {
    return [...deals].sort((a: BlockDeal, b: BlockDeal) => b.amount - a.amount);
  }, [deals]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="font-serif text-3xl mb-2">Leaderboard</h2>
      <p className={`mb-8 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
        Block deals ranked by transaction value
      </p>

      <div className="space-y-3">
        {sortedDeals.length > 0 ? sortedDeals.map((deal: BlockDeal, index: number) => {
          let config = DEAL_TYPES[deal.dealType];
           if (!config) {
             const match = Object.keys(DEAL_TYPES).find(key => deal.dealType.includes(key));
             config = match ? DEAL_TYPES[match] : DEAL_TYPES["block-transfer"];
           }
          
          return (
            <div 
              key={deal.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                darkMode 
                  ? 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border border-zinc-100 shadow-sm hover:shadow-md'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                index === 0 ? 'bg-amber-500 text-white' :
                index === 1 ? 'bg-zinc-400 text-white' :
                index === 2 ? 'bg-orange-700 text-white' :
                darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {index + 1}
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${config?.bgGradient || 'from-zinc-100 to-zinc-200'} text-black/80`}>
                {config?.icon || '📊'}
              </div>
              <div className="flex-grow min-w-0">
                <div className="font-medium truncate">{deal.stock.name}</div>
                <div className={`text-sm truncate ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {deal.title}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-emerald-500">
                  {deal.amountDisplay}
                </div>
                <div className={`text-xs ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {new Date(deal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          );
        }) : (
           <p className="text-center text-zinc-500 py-10">No deals to rank yet.</p>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// GLOSSARY PAGE
// ============================================================================

function GlossaryPage({ darkMode }: any) {
  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="font-serif text-3xl mb-2">Glossary</h2>
      <p className={`mb-8 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
        Key terms to understand Indian block deal mechanics
      </p>

      <div className="space-y-4">
        {Object.entries(GLOSSARY).map(([key, item]) => (
          <div 
            key={key}
            id={key}
            className={`p-5 rounded-xl ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-100 shadow-sm'}`}
          >
            <h3 className="font-serif text-xl mb-2">{item.term}</h3>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {item.definition}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// ABOUT PAGE
// ============================================================================

function AboutPage({ darkMode }: any) {
  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      <h2 className="font-serif text-3xl mb-6">About</h2>
      
      <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none`}>
        <h3 className="font-serif">What is this?</h3>
        <p className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>
          Block Deals India tracks significant institutional transactions on NSE and BSE—trades too large 
          for the regular order book, executed in a separate window where institutions quietly reposition. 
          These deals often signal what smart money really thinks about a stock, long before it shows up 
          in quarterly reports or analyst calls.
        </p>

        <h3 className="font-serif mt-8">Why does this matter?</h3>
        <p className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>
          Every day, thousands of crores change hands in block deals. When Tiger Global exits Zomato, 
          when GIC builds a position in Dixon, when a promoter keeps buying their own stock—these are 
          signals. Not investment advice, but data points that help you understand what the biggest 
          players are actually doing with their money.
        </p>

        <h3 className="font-serif mt-8">The commentary</h3>
        <p className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>
          Raw data is boring. We add context: Why might this deal have happened? What's the backstory? 
          Who benefits? The tone is knowing, occasionally irreverent—because sometimes the best way to 
          understand markets is to see through the PR.
        </p>

        <h3 className="font-serif mt-8">Data sources</h3>
        <p className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>
          All block deal data comes directly from NSE and BSE official disclosures. Commentary and analysis 
          is our own interpretation and should not be construed as investment advice.
        </p>

        <h3 className="font-serif mt-8">Inspiration</h3>
        <p className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>
          This project is inspired by <a href="https://web3isgoinggreat.com" className="text-rose-500 hover:underline">Web3 is Going Just Great</a> by 
          Molly White—a brilliant example of how editorial voice and open data can combine to create 
          something genuinely useful.
        </p>
      </div>
    </section>
  );
}