import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { vi } from 'vitest';
import { PortfolioService } from './portfolio.service';
import { Portfolio, Holding } from '../models/portfolio.model';

// ── Capacitor mock — hoisted by Vitest ───────────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

import { Capacitor } from '@capacitor/core';

// ── Fixtures ─────────────────────────────────────────────────
const mockHolding: Holding = {
  id: 'h1',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  quantity: 10,
  currentPrice: 200,
  currentValue: 2000,
  avgCostBasis: 150,
  totalCost: 1500,
  gainLoss: 500,
  gainLossPercent: 33.33,
  assetType: 'stock',
};

const mockPortfolio: Portfolio = {
  id: 'p1',
  totalValue: 100000,
  dailyChange: 500,
  dailyChangePercent: 0.5,
  lastUpdated: new Date('2024-01-01'),
  holdings: [mockHolding],
};

// ── Tests ────────────────────────────────────────────────────
describe('PortfolioService', () => {
  let service: PortfolioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PortfolioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
  });

  describe('getPortfolio()', () => {
    it('calls GET /api/portfolio on web/iOS', () => {
      service.getPortfolio().subscribe();
      const req = httpMock.expectOne('http://localhost:3000/api/portfolio');
      expect(req.request.method).toBe('GET');
      req.flush(mockPortfolio);
    });

    it('returns the portfolio data from the response', () => {
      let result: Portfolio | undefined;
      service.getPortfolio().subscribe((p) => (result = p));

      httpMock.expectOne('http://localhost:3000/api/portfolio').flush(mockPortfolio);

      expect(result?.id).toBe('p1');
      expect(result?.totalValue).toBe(100000);
      expect(result?.holdings).toHaveLength(1);
      expect(result?.holdings[0].ticker).toBe('AAPL');
    });

    it('calls GET with 10.0.2.2 on Android native', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

      service.getPortfolio().subscribe();
      const req = httpMock.expectOne('http://10.0.2.2:3000/api/portfolio');
      expect(req.request.method).toBe('GET');
      req.flush(mockPortfolio);
    });

    it('keeps localhost URL on iOS native', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');

      service.getPortfolio().subscribe();
      const req = httpMock.expectOne('http://localhost:3000/api/portfolio');
      req.flush(mockPortfolio);
    });

    it('propagates HTTP error to the caller', () => {
      let errorCaught = false;
      service.getPortfolio().subscribe({ error: () => (errorCaught = true) });

      httpMock
        .expectOne('http://localhost:3000/api/portfolio')
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(errorCaught).toBe(true);
    });
  });

  describe('getHoldings()', () => {
    it('calls GET /api/portfolio/holdings on web', () => {
      service.getHoldings().subscribe();
      const req = httpMock.expectOne('http://localhost:3000/api/portfolio/holdings');
      expect(req.request.method).toBe('GET');
      req.flush([mockHolding]);
    });

    it('returns an array of holdings', () => {
      let result: Holding[] | undefined;
      service.getHoldings().subscribe((h) => (result = h));

      httpMock
        .expectOne('http://localhost:3000/api/portfolio/holdings')
        .flush([mockHolding]);

      expect(result).toHaveLength(1);
      expect(result?.[0].ticker).toBe('AAPL');
    });

    it('uses 10.0.2.2 for holdings on Android native', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

      service.getHoldings().subscribe();
      const req = httpMock.expectOne('http://10.0.2.2:3000/api/portfolio/holdings');
      req.flush([mockHolding]);
    });
  });
});
