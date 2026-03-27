export interface Holding {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  avgCostBasis: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  assetType: 'stock' | 'etf' | 'crypto' | 'bond';
}

export interface Portfolio {
  id: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  lastUpdated: Date;
  holdings: Holding[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatRequest {
  message: string;
  context?: {
    portfolio: Portfolio;
    messages: ChatMessage[];
  };
}
