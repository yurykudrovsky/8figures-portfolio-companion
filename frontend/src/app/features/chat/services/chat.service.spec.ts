import { vi } from 'vitest';
import { ChatService } from './chat.service';
import { Portfolio } from '../../../core/models/portfolio.model';

// ── Fixture ───────────────────────────────────────────────────
const mockPortfolio: Portfolio = {
  id: 'p1',
  totalValue: 97500,
  dailyChange: 800,
  dailyChangePercent: 0.83,
  lastUpdated: new Date('2024-01-15'),
  holdings: [
    {
      id: 'h1', ticker: 'NVDA', name: 'NVIDIA Corporation',
      quantity: 5, currentPrice: 900, currentValue: 4500,
      avgCostBasis: 400, totalCost: 2000, gainLoss: 2500, gainLossPercent: 125,
      assetType: 'stock',
    },
    {
      id: 'h2', ticker: 'AAPL', name: 'Apple Inc.',
      quantity: 10, currentPrice: 200, currentValue: 2000,
      avgCostBasis: 150, totalCost: 1500, gainLoss: 500, gainLossPercent: 33.33,
      assetType: 'stock',
    },
    {
      id: 'h3', ticker: 'TSLA', name: 'Tesla Inc.',
      quantity: 20, currentPrice: 100, currentValue: 2000,
      avgCostBasis: 200, totalCost: 4000, gainLoss: -2000, gainLossPercent: -50,
      assetType: 'stock',
    },
    {
      id: 'h4', ticker: 'BTC', name: 'Bitcoin',
      quantity: 1, currentPrice: 60000, currentValue: 60000,
      avgCostBasis: 40000, totalCost: 40000, gainLoss: 20000, gainLossPercent: 50,
      assetType: 'crypto',
    },
    {
      id: 'h5', ticker: 'ETH', name: 'Ethereum',
      quantity: 10, currentPrice: 2000, currentValue: 20000,
      avgCostBasis: 2500, totalCost: 25000, gainLoss: -5000, gainLossPercent: -20,
      assetType: 'crypto',
    },
    {
      id: 'h6', ticker: 'VOO', name: 'Vanguard S&P 500 ETF',
      quantity: 20, currentPrice: 450, currentValue: 9000,
      avgCostBasis: 400, totalCost: 8000, gainLoss: 1000, gainLossPercent: 12.5,
      assetType: 'etf',
    },
  ],
};

// ── Helper ────────────────────────────────────────────────────
function collectStream(service: ChatService, message: string): string {
  const chars: string[] = [];
  service.sendMessage(message, mockPortfolio, []).subscribe({
    next: (c) => chars.push(c),
  });
  vi.runAllTimers();
  return chars.join('');
}

// ── Tests ─────────────────────────────────────────────────────
describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ChatService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── streamResponse ─────────────────────────────────────────
  describe('streamResponse()', () => {
    it('emits characters one at a time in order', () => {
      const chars: string[] = [];
      service.streamResponse('Hi').subscribe({ next: (c) => chars.push(c) });

      vi.advanceTimersByTime(15);
      expect(chars).toEqual(['H']);

      vi.advanceTimersByTime(15);
      expect(chars).toEqual(['H', 'i']);
    });

    it('completes after all characters are emitted', () => {
      let completed = false;
      service.streamResponse('AB').subscribe({ complete: () => (completed = true) });

      vi.advanceTimersByTime(45); // 15ms × 2 chars + 1 tick to complete
      expect(completed).toBe(true);
    });

    it('emits every character of a longer string', () => {
      const text = 'Hello';
      const chars: string[] = [];
      service.streamResponse(text).subscribe({ next: (c) => chars.push(c) });
      vi.runAllTimers();
      expect(chars.join('')).toBe(text);
    });

    it('handles empty string — completes immediately on next tick', () => {
      let completed = false;
      const chars: string[] = [];
      service.streamResponse('').subscribe({
        next: (c) => chars.push(c),
        complete: () => (completed = true),
      });
      vi.advanceTimersByTime(15);
      expect(chars).toHaveLength(0);
      expect(completed).toBe(true);
    });

    it('clears the interval on unsubscribe', () => {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');
      const sub = service.streamResponse('Test').subscribe();
      sub.unsubscribe();
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  // ── Response routing ───────────────────────────────────────
  describe('sendMessage() — response routing', () => {
    it('routes portfolio performance questions', () => {
      const result = collectStream(service, 'How is my portfolio doing?');
      expect(result).toContain('holdings');
      expect(result).toContain('green');
      expect(result).toContain('red');
    });

    it('routes best performer questions', () => {
      const result = collectStream(service, 'What is my best performer?');
      // NVDA has the highest gainLossPercent (125%); BTC is second (50%)
      expect(result).toContain('NVDA');
      expect(result).toContain('BTC'); // second-best
    });

    it('routes worst performer questions', () => {
      const result = collectStream(service, 'What is my worst performer?');
      // TSLA has the lowest gainLossPercent (-50%)
      expect(result).toContain('TSLA');
    });

    it('routes rebalancing questions', () => {
      const result = collectStream(service, 'Should I rebalance my portfolio?');
      expect(result).toContain('%');
      expect(result).toContain('ETF');
    });

    it('routes crypto exposure questions', () => {
      const result = collectStream(service, 'What is my crypto exposure?');
      expect(result).toContain('BTC');
      expect(result).toContain('ETH');
    });

    it('uses fallback for unrecognised questions', () => {
      const result = collectStream(service, 'Tell me about the weather');
      // Fallback references largest holding (BTC at $60,000)
      expect(result).toContain('BTC');
      expect(result).toContain('6 positions');
    });
  });

  // ── Response content accuracy ──────────────────────────────
  describe('sendMessage() — content accuracy', () => {
    it('portfolio summary references the daily direction', () => {
      // dailyChange is positive (800), so the response says "up"
      const result = collectStream(service, 'How is my portfolio overall?');
      expect(result).toContain('up');
    });

    it('portfolio summary mentions correct holding count', () => {
      const result = collectStream(service, 'overall performance');
      expect(result).toContain('6 holdings');
    });

    it('best performer response includes portfolio weight', () => {
      const result = collectStream(service, 'top performer');
      expect(result).toContain('%'); // weight percentage included
    });

    it('worst performer response suggests tax-loss harvesting', () => {
      const result = collectStream(service, 'biggest loser');
      expect(result).toContain('tax-loss');
    });

    it('crypto response flags high exposure when above 20%', () => {
      // BTC+ETH = $80,000 out of $97,500 = ~82% — above 20% threshold
      const result = collectStream(service, 'crypto');
      expect(result).toContain('significant portion');
    });

    it('rebalance response mentions underwater positions', () => {
      // TSLA and ETH are losers
      const result = collectStream(service, 'diversification');
      expect(result).toContain('underwater');
    });
  });
});
