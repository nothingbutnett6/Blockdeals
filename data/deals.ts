import { BlockDeal, DealTypeConfig, GlossaryTerm } from "../types";

export const DEAL_TYPES: Record<string, DealTypeConfig> = {
  "fii-entry": { label: "FII Entry", icon: "🏛️", color: "emerald", bgGradient: "from-emerald-50 to-green-100" },
  "promoter-exit": { label: "Promoter Exit", icon: "📤", color: "rose", bgGradient: "from-rose-50 to-red-100" },
  "insider-buy": { label: "Insider Buy", icon: "💼", color: "blue", bgGradient: "from-blue-50 to-indigo-100" },
  "block-transfer": { label: "Block Transfer", icon: "🔄", color: "amber", bgGradient: "from-amber-50 to-yellow-100" },
  "stake-sale": { label: "Stake Sale", icon: "⚡", color: "purple", bgGradient: "from-purple-50 to-violet-100" },
  "ipo-anchor": { label: "IPO Anchor", icon: "🚀", color: "cyan", bgGradient: "from-cyan-50 to-teal-100" },
  "qip": { label: "QIP", icon: "💰", color: "orange", bgGradient: "from-orange-50 to-amber-100" },
  "corporate-action": { label: "Corporate Action", icon: "🏢", color: "slate", bgGradient: "from-slate-50 to-gray-100" }
};

export const GLOSSARY: Record<string, GlossaryTerm> = {
  "block-deal": {
    term: "Block Deal",
    definition: "A single transaction of minimum 5 lakh shares or ₹10 crore, executed through a separate trading window on NSE/BSE. Block deals happen in a 35-minute window (8:45-9:20 AM) before market opens."
  },
  "bulk-deal": {
    term: "Bulk Deal",
    definition: "When total buy/sell of a security by any person exceeds 0.5% of the company's shares during regular market hours. Unlike block deals, these happen throughout the trading day."
  },
  "fii": {
    term: "FII (Foreign Institutional Investor)",
    definition: "International investment funds, pension funds, and asset managers registered with SEBI to invest in Indian markets. Now officially called FPIs (Foreign Portfolio Investors)."
  },
  "dii": {
    term: "DII (Domestic Institutional Investor)",
    definition: "Indian mutual funds, insurance companies, and pension funds. When FIIs sell, DIIs often provide the other side of the trade."
  },
  "promoter": {
    term: "Promoter",
    definition: "Founders, founding families, or controlling shareholders of a company. Promoter stake changes are closely watched as signals of confidence (or lack thereof)."
  },
  "qip": {
    term: "QIP (Qualified Institutional Placement)",
    definition: "A capital-raising mechanism where listed companies issue shares to qualified institutional buyers. Faster than a follow-on public offer and doesn't require SEBI approval."
  },
  "anchor-investor": {
    term: "Anchor Investor",
    definition: "Institutional investors who commit to buying IPO shares before the public offering opens. They face a 30-day lock-in, after which they often exit via block deals."
  },
  "ofs": {
    term: "OFS (Offer for Sale)",
    definition: "A mechanism for promoters or large shareholders to sell shares through the stock exchange. More transparent than block deals but takes longer."
  },
  "swf": {
    term: "SWF (Sovereign Wealth Fund)",
    definition: "Government-owned investment funds like GIC (Singapore), ADIA (Abu Dhabi), or Norges Bank (Norway). Their investments are seen as long-term endorsements."
  },
  "sebi": {
    term: "SEBI",
    definition: "Securities and Exchange Board of India—the market regulator. They set rules for block deals, insider trading, and disclosure requirements."
  }
};

export const DEALS_DATA: BlockDeal[] = [];