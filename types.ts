export interface DealSource {
  name: string;
  url: string;
}

export interface StockInfo {
  symbol: string;
  name: string;
}

export enum DealType {
  BUY = 'buy',
  SELL = 'sell',
}

export interface BlockDeal {
  id: string;
  date: string;
  title: string;
  stock: StockInfo;
  amount: number; // in paise
  amountDisplay: string;
  quantity?: number; // number of shares
  price?: number; // price per share
  dealType: string;
  direction: string; // 'buy' | 'sell' | 'transfer' | 'conversion' etc
  discount: number;
  body: string;
  buyer: string;
  seller: string;
  tags: string[];
  sources: DealSource[];
  image?: string | null;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface DealTypeConfig {
    label: string;
    icon: string;
    color: string;
    bgGradient: string;
}

export interface FilterState {
  search: string;
  minValue: number;
}