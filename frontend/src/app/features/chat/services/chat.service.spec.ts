import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { Portfolio } from '../../../core/models/portfolio.model';
import { ChatMessage } from '../models/chat.model';

// ── Capacitor mock — hoisted by Vitest ───────────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

import { Capacitor } from '@capacitor/core';

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

// ── Tests ─────────────────────────────────────────────────────
describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

    TestBed.configureTestingModule({
      providers: [
        ChatService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
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

    // ── STREAMING_INTERVAL_MS behavioural tests ────────────────
    it('STREAMING_INTERVAL_MS: first character emits after exactly 15ms, not before', () => {
      const chars: string[] = [];
      service.streamResponse('hello').subscribe({ next: (c) => chars.push(c) });

      // 14ms — interval has not fired yet; no emission expected
      vi.advanceTimersByTime(14);
      expect(chars).toHaveLength(0);

      // advance the remaining 1ms to reach exactly 15ms — first tick fires
      vi.advanceTimersByTime(1);
      expect(chars).toEqual(['h']);
    });

    it('STREAMING_INTERVAL_MS: no emission before 15ms for single-character input', () => {
      const chars: string[] = [];
      service.streamResponse('x').subscribe({ next: (c) => chars.push(c) });

      vi.advanceTimersByTime(14);
      expect(chars).toHaveLength(0);
    });

    it('STREAMING_INTERVAL_MS: stream completes on tick N+1 (at (N+1)*15ms) for length-N string', () => {
      const chars: string[] = [];
      let done = false;

      service.streamResponse('ab').subscribe({
        next: (c) => chars.push(c),
        complete: () => (done = true),
      });

      // At 30ms both characters have been emitted but complete has not fired
      vi.advanceTimersByTime(30);
      expect(chars).toEqual(['a', 'b']);
      expect(done).toBe(false);

      // At 45ms the exhaustion tick fires: clearInterval + observer.complete()
      vi.advanceTimersByTime(15);
      expect(done).toBe(true);
    });

    it('emits all characters and completes for a multi-word string', () => {
      const text = 'Hello World';
      const chars: string[] = [];
      service.streamResponse(text).subscribe({ next: (c) => chars.push(c) });
      vi.runAllTimers();
      expect(chars.join('')).toBe(text);
    });

    it('each emission is exactly one character', () => {
      const chars: string[] = [];
      service.streamResponse('abc').subscribe({ next: (c) => chars.push(c) });
      vi.runAllTimers();
      chars.forEach((c) => expect(c).toHaveLength(1));
    });
  });

  // ── sendMessage() — HTTP layer ─────────────────────────────
  describe('sendMessage() — HTTP layer', () => {
    it('makes POST to /api/chat', () => {
      const chars: string[] = [];
      service.sendMessage('test question', mockPortfolio, []).subscribe({
        next: (c) => chars.push(c),
      });

      const req = httpMock.expectOne('http://localhost:3000/api/chat');
      expect(req.request.method).toBe('POST');
      req.flush('data: {"char":"H"}\n\ndata: {"done":true}\n\n');
      vi.runAllTimers();
    });

    it('request body contains message and portfolio context', () => {
      service.sendMessage('test question', mockPortfolio, []).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/chat');
      expect(req.request.body.message).toBe('test question');
      expect(req.request.body.context.portfolio.id).toBe('p1');
      req.flush('data: {"done":true}\n\n');
      vi.runAllTimers();
    });

    it('request body includes message history', () => {
      const history: ChatMessage[] = [
        { id: 'm1', role: 'user', content: 'hello', timestamp: new Date() },
        { id: 'm2', role: 'assistant', content: 'hi there', timestamp: new Date() },
      ];

      service.sendMessage('follow-up question', mockPortfolio, history).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/chat');
      expect(req.request.body.context.messages).toHaveLength(2);
      expect(req.request.body.context.messages).toEqual(history);
      req.flush('data: {"done":true}\n\n');
      vi.runAllTimers();
    });

    it('parses SSE body and streams chars', () => {
      const chars: string[] = [];
      service.sendMessage('test', mockPortfolio, []).subscribe({
        next: (c) => chars.push(c),
      });

      const req = httpMock.expectOne('http://localhost:3000/api/chat');
      req.flush('data: {"char":"H"}\n\ndata: {"char":"i"}\n\ndata: {"done":true}\n\n');
      vi.runAllTimers();

      expect(chars.join('')).toBe('Hi');
    });

    it('ignores done frame — no extra character', () => {
      const chars: string[] = [];
      service.sendMessage('test', mockPortfolio, []).subscribe({
        next: (c) => chars.push(c),
      });

      const req = httpMock.expectOne('http://localhost:3000/api/chat');
      req.flush('data: {"done":true}\n\n');
      vi.runAllTimers();

      expect(chars.join('')).toBe('');
    });

    it('uses 10.0.2.2 on Android native', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

      service.sendMessage('test', mockPortfolio, []).subscribe();

      const req = httpMock.expectOne('http://10.0.2.2:3000/api/chat');
      expect(req.request.method).toBe('POST');
      req.flush('data: {"done":true}\n\n');
      vi.runAllTimers();
    });

    it('HTTP error triggers fallback — completes without error', () => {
      const chars: string[] = [];
      let errorCaught = false;
      let completed = false;

      service.sendMessage('test', mockPortfolio, []).subscribe({
        next: (c) => chars.push(c),
        error: () => (errorCaught = true),
        complete: () => (completed = true),
      });

      const req = httpMock.expectOne('http://localhost:3000/api/chat');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      vi.runAllTimers();

      expect(errorCaught).toBe(false);
      expect(completed).toBe(true);
      expect(chars.join('')).toContain('trouble connecting');
    });
  });
});
