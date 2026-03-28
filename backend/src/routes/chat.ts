import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { ChatRequest, Portfolio } from '../models/portfolio.model';

const STREAMING_INTERVAL_MS = 15;

const router = Router();

// Instantiate once at module level — null when key is absent
const apiKey = process.env['ANTHROPIC_API_KEY'];
const anthropicClient = apiKey ? new Anthropic({ apiKey }) : null;

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDailyChange(dailyChange: number, dailyChangePercent: number): string {
  const sign = dailyChange >= 0 ? '+' : '';
  const formatted = dailyChange.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return `${sign}${formatted} (${sign}${dailyChangePercent.toFixed(2)}%)`;
}

function buildSystemPrompt(portfolio: Portfolio): string {
  const holdingLines = portfolio.holdings
    .map(
      (h) =>
        `- ${h.ticker} (${h.name}): ${h.quantity} shares @ $${h.currentPrice.toFixed(2)}` +
        ` = ${formatCurrency(h.currentValue)}` +
        ` | P&L: ${h.gainLoss >= 0 ? '+' : ''}${formatCurrency(h.gainLoss)}` +
        ` (${h.gainLossPercent.toFixed(2)}%)`
    )
    .join('\n');

  return [
    'You are an AI financial advisor for 8FIGURES. Answer concisely and reference specific portfolio data.',
    '',
    'Portfolio Summary:',
    `- Total value: ${formatCurrency(portfolio.totalValue)}`,
    `- Daily change: ${formatDailyChange(portfolio.dailyChange, portfolio.dailyChangePercent)}`,
    '',
    'Holdings:',
    holdingLines,
    '',
    'Be direct and helpful. Reference specific tickers and numbers when answering.',
  ].join('\n');
}

function buildResponse(message: string, portfolio: Portfolio): string {
  const lower = message.toLowerCase();
  const totalValue = portfolio.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const dailyChange = portfolio.dailyChange.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const dailyPct = portfolio.dailyChangePercent.toFixed(2);
  const sign = portfolio.dailyChange >= 0 ? '+' : '';

  if (lower.includes('how is my portfolio') || lower.includes('portfolio doing')) {
    const topHoldings = [...portfolio.holdings]
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 3)
      .map(h => h.ticker)
      .join(', ');
    return `Your portfolio is currently valued at ${totalValue}, with a daily change of ${sign}${dailyChange} (${sign}${dailyPct}%). You hold ${portfolio.holdings.length} positions across stocks, ETFs, and crypto. Your largest positions include ${topHoldings}. Overall your long-term cost basis shows healthy unrealized gains.`;
  }

  if (lower.includes('best performer') || lower.includes('top performer')) {
    const best = [...portfolio.holdings].sort((a, b) => b.gainLossPercent - a.gainLossPercent)[0];
    const gain = best.gainLoss.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return `Your best performer is ${best.ticker} (${best.name}) with a gain of +${gain} (+${best.gainLossPercent.toFixed(2)}%). It currently makes up ${((best.currentValue / portfolio.totalValue) * 100).toFixed(1)}% of your portfolio.`;
  }

  if (lower.includes('rebalance')) {
    const cryptoValue = portfolio.holdings
      .filter(h => h.assetType === 'crypto')
      .reduce((sum, h) => sum + h.currentValue, 0);
    const cryptoPct = ((cryptoValue / portfolio.totalValue) * 100).toFixed(1);
    return `Based on your current allocation, crypto represents ${cryptoPct}% of your portfolio. A typical balanced portfolio keeps crypto under 10–15%. Consider reviewing your TSLA and ETH positions as both are showing unrealized losses, which could be harvested for tax purposes. Your VOO ETF provides solid diversification as your core holding.`;
  }

  if (lower.includes('crypto')) {
    const cryptoHoldings = portfolio.holdings.filter(h => h.assetType === 'crypto');
    const cryptoValue = cryptoHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const cryptoPct = ((cryptoValue / portfolio.totalValue) * 100).toFixed(1);
    const cryptoFormatted = cryptoValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const names = cryptoHoldings.map(h => `${h.ticker} (${((h.currentValue / portfolio.totalValue) * 100).toFixed(1)}%)`).join(' and ');
    return `Your total crypto exposure is ${cryptoFormatted}, representing ${cryptoPct}% of your portfolio. You hold ${names}. BTC is your strongest crypto position with significant unrealized gains, while ETH is slightly underwater.`;
  }

  // Fallback intelligent response
  const losers = portfolio.holdings.filter(h => h.gainLoss < 0).map(h => h.ticker).join(', ');
  return `That's a great question about your portfolio. Currently valued at ${totalValue}, your positions are diversified across stocks, ETFs, and crypto. Positions currently showing losses include ${losers}. Would you like me to analyze a specific holding or discuss rebalancing strategies?`;
}

interface AnthropicTextDelta {
  type: 'content_block_delta';
  delta: {
    type: 'text_delta';
    text: string;
  };
}

router.post('/', (req: Request, res: Response): void => {
  const body = req.body as ChatRequest;

  if (!body.message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const portfolio = body.context?.portfolio;
  if (!portfolio) {
    res.status(400).json({ error: 'portfolio context is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (anthropicClient !== null) {
    // Live path — real Claude API
    const systemPrompt = buildSystemPrompt(portfolio);
    const stream = anthropicClient.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: body.message }],
    });

    (async () => {
      try {
        for await (const event of stream as AsyncIterable<AnthropicTextDelta | { type: string }>) {
          if (
            event.type === 'content_block_delta' &&
            (event as AnthropicTextDelta).delta.type === 'text_delta'
          ) {
            const text = (event as AnthropicTextDelta).delta.text;
            for (const char of text) {
              res.write(`data: ${JSON.stringify({ char })}\n\n`);
            }
          }
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
      }
    })();
  } else {
    // Fallback path — mock streaming
    const responseText = buildResponse(body.message, portfolio);
    let index = 0;
    const interval = setInterval(() => {
      if (index < responseText.length) {
        res.write(`data: ${JSON.stringify({ char: responseText[index] })}\n\n`);
        index++;
      } else {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        clearInterval(interval);
        res.end();
      }
    }, STREAMING_INTERVAL_MS);
  }
});

export default router;
