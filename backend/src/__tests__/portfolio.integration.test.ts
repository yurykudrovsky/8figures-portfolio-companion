import request from 'supertest';
import app from '../index';

interface HoldingResponseBody {
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

interface PortfolioResponseBody {
  id: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  lastUpdated: string;
  holdings: HoldingResponseBody[];
}

describe('GET /api/health', () => {
  it('health returns 200 with ok status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
  });
});

describe('GET /api/portfolio', () => {
  it('portfolio returns 200 with Portfolio shape', async () => {
    const response = await request(app).get('/api/portfolio');
    expect(response.status).toBe(200);
    const body = response.body as PortfolioResponseBody;
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
    expect(typeof body.totalValue).toBe('number');
    expect(typeof body.dailyChange).toBe('number');
    expect(typeof body.dailyChangePercent).toBe('number');
    expect(typeof body.lastUpdated).toBe('string');
    expect(Array.isArray(body.holdings)).toBe(true);
    expect(body.holdings.length).toBeGreaterThanOrEqual(1);
  });

  it('portfolio totalValue is a positive number', async () => {
    const response = await request(app).get('/api/portfolio');
    const body = response.body as PortfolioResponseBody;
    expect(body.totalValue).toBeGreaterThan(0);
  });
});

describe('GET /api/portfolio/holdings', () => {
  it('holdings returns array of 8 Holding objects', async () => {
    const response = await request(app).get('/api/portfolio/holdings');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect((response.body as HoldingResponseBody[]).length).toBe(8);
  });

  it('each holding has required fields', async () => {
    const response = await request(app).get('/api/portfolio/holdings');
    const holdings = response.body as HoldingResponseBody[];
    const validAssetTypes = ['stock', 'etf', 'crypto', 'bond'];

    for (const holding of holdings) {
      expect(typeof holding.id).toBe('string');
      expect(typeof holding.ticker).toBe('string');
      expect(typeof holding.name).toBe('string');
      expect(typeof holding.quantity).toBe('number');
      expect(typeof holding.currentPrice).toBe('number');
      expect(typeof holding.currentValue).toBe('number');
      expect(typeof holding.avgCostBasis).toBe('number');
      expect(typeof holding.totalCost).toBe('number');
      expect(typeof holding.gainLoss).toBe('number');
      expect(typeof holding.gainLossPercent).toBe('number');
      expect(validAssetTypes).toContain(holding.assetType);
    }
  });
});
