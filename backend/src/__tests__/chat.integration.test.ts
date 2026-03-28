import request from 'supertest';
import app from '../index';
import { mockPortfolio } from '../data/mock-portfolio';

interface SseCharFrame {
  char: string;
}

interface SseDoneFrame {
  done: true;
}

type SseFrame = SseCharFrame | SseDoneFrame;

function parseSseFrames(raw: string): SseFrame[] {
  return raw
    .split('\n\n')
    .filter((block) => block.startsWith('data: '))
    .map((block) => JSON.parse(block.slice('data: '.length)) as SseFrame);
}

function collectText(frames: SseFrame[]): string {
  return frames
    .filter((f): f is SseCharFrame => 'char' in f)
    .map((f) => f.char)
    .join('');
}

const validBody = {
  message: 'How is my portfolio doing?',
  context: {
    portfolio: mockPortfolio as unknown as Record<string, unknown>,
    messages: [],
  },
};

describe('POST /api/chat', () => {
  it('returns 400 when message is absent', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('message is required');
  });

  it('returns 400 when portfolio context is absent', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .send({ message: 'hello' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('portfolio context is required');
  });

  it('streams text/event-stream content type', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .set('Accept', 'text/event-stream')
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => { callback(null, data); });
      })
      .send(validBody);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
  });

  it('stream body starts with data: prefix', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .set('Accept', 'text/event-stream')
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => { callback(null, data); });
      })
      .send(validBody);
    const rawBody = response.body as string;
    const firstNonEmptyLine = rawBody
      .split('\n')
      .find((line) => line.trim().length > 0) ?? '';
    expect(firstNonEmptyLine.startsWith('data:')).toBe(true);
  });

  it('response text contains a holding ticker for portfolio question', async () => {
    const body = {
      message: 'How is my portfolio doing?',
      context: {
        portfolio: mockPortfolio as unknown as Record<string, unknown>,
        messages: [],
      },
    };
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .set('Accept', 'text/event-stream')
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => { callback(null, data); });
      })
      .send(body);
    const frames = parseSseFrames(response.body as string);
    const text = collectText(frames);
    const tickers = ['AAPL', 'NVDA', 'MSFT', 'BTC', 'ETH', 'VOO', 'TSLA', 'AMZN'];
    const hasTicker = tickers.some((ticker) => text.includes(ticker));
    expect(hasTicker).toBe(true);
  });

  it('response text contains a holding name for best performer question', async () => {
    const body = {
      message: 'What is my best performer?',
      context: {
        portfolio: mockPortfolio as unknown as Record<string, unknown>,
        messages: [],
      },
    };
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .set('Accept', 'text/event-stream')
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => { callback(null, data); });
      })
      .send(body);
    const frames = parseSseFrames(response.body as string);
    const text = collectText(frames);
    const names = ['Apple', 'NVIDIA', 'Microsoft', 'Bitcoin', 'Ethereum', 'Vanguard', 'Tesla', 'Amazon'];
    const hasName = names.some((name) => text.includes(name));
    expect(hasName).toBe(true);
  });
});
