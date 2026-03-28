import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Portfolio } from '../../../core/models/portfolio.model';
import { ChatMessage } from '../models/chat.model';

const STREAMING_INTERVAL_MS = 15;

@Injectable({ providedIn: 'root' })
export class ChatService {
  // ── Mandatory streaming pattern from CLAUDE.md ────────────────
  streamResponse(text: string): Observable<string> {
    return new Observable<string>((observer) => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          observer.next(text[index]);
          index++;
        } else {
          clearInterval(interval);
          observer.complete();
        }
      }, STREAMING_INTERVAL_MS);

      // Cleanup on unsubscribe
      return () => clearInterval(interval);
    });
  }

  sendMessage(
    userMessage: string,
    portfolio: Portfolio,
    _history: ChatMessage[]
  ): Observable<string> {
    const response = this.buildResponse(userMessage, portfolio);
    return this.streamResponse(response);
  }

  // ── Contextual response builder ───────────────────────────────
  private buildResponse(message: string, portfolio: Portfolio): string {
    const lower = message.toLowerCase();

    if (this.matches(lower, ['how is my portfolio', 'portfolio doing', 'overall', 'performance'])) {
      return this.portfolioSummaryResponse(portfolio);
    }

    if (this.matches(lower, ['best performer', 'top performer', 'biggest winner', 'best stock'])) {
      return this.bestPerformerResponse(portfolio);
    }

    if (this.matches(lower, ['worst performer', 'biggest loser', 'losing', 'worst stock', 'down the most'])) {
      return this.worstPerformerResponse(portfolio);
    }

    if (this.matches(lower, ['rebalanc', 'diversif', 'allocation', 'should i sell', 'should i buy'])) {
      return this.rebalanceResponse(portfolio);
    }

    if (this.matches(lower, ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'digital asset'])) {
      return this.cryptoExposureResponse(portfolio);
    }

    return this.fallbackResponse(message, portfolio);
  }

  private matches(lower: string, keywords: string[]): boolean {
    return keywords.some((kw) => lower.includes(kw));
  }

  // ── Pre-built contextual responses ───────────────────────────
  private portfolioSummaryResponse(portfolio: Portfolio): string {
    const total = this.fmt(portfolio.totalValue);
    const change = this.fmtChange(portfolio.dailyChange);
    const pct = this.fmtPct(portfolio.dailyChangePercent);
    const sign = portfolio.dailyChange >= 0 ? 'up' : 'down';
    const gainers = portfolio.holdings.filter((h) => h.gainLoss > 0).length;
    const losers = portfolio.holdings.filter((h) => h.gainLoss < 0).length;
    const totalGain = portfolio.holdings.reduce((s, h) => s + h.gainLoss, 0);
    const totalGainStr = this.fmtChange(totalGain);

    return (
      `Your portfolio is currently valued at ${total}, ${sign} ${change} (${pct}) today. ` +
      `Across your ${portfolio.holdings.length} holdings, ${gainers} are in the green and ${losers} are in the red. ` +
      `Your total unrealized gain/loss across all positions is ${totalGainStr}. ` +
      `Would you like me to break down any specific holding or discuss rebalancing opportunities?`
    );
  }

  private bestPerformerResponse(portfolio: Portfolio): string {
    const sorted = [...portfolio.holdings].sort((a, b) => b.gainLossPercent - a.gainLossPercent);
    const best = sorted[0];
    const second = sorted[1];
    const value = this.fmt(best.currentValue);
    const gain = this.fmtChange(best.gainLoss);
    const pct = this.fmtPct(best.gainLossPercent);
    const weight = ((best.currentValue / portfolio.totalValue) * 100).toFixed(1);

    return (
      `Your best performer is ${best.ticker} — ${best.name}. ` +
      `It's up ${gain} (${pct}) from your cost basis and now represents ${weight}% of your portfolio at ${value}. ` +
      `${second.ticker} is your second-best performer at ${this.fmtPct(second.gainLossPercent)}. ` +
      `With ${best.ticker} showing strong gains, it may be worth reviewing whether it has become overweight in your allocation.`
    );
  }

  private worstPerformerResponse(portfolio: Portfolio): string {
    const sorted = [...portfolio.holdings].sort((a, b) => a.gainLossPercent - b.gainLossPercent);
    const worst = sorted[0];
    const loss = this.fmtChange(worst.gainLoss);
    const pct = this.fmtPct(worst.gainLossPercent);
    const cost = this.fmt(worst.totalCost);

    return (
      `Your worst performer right now is ${worst.ticker} — ${worst.name}. ` +
      `You're down ${loss} (${pct}) on a cost basis of ${cost}. ` +
      `This could be a tax-loss harvesting opportunity if you're in a taxable account, ` +
      `or a potential averaging-down situation if your thesis on ${worst.ticker} is still intact. ` +
      `Would you like to talk through options for this position?`
    );
  }

  private rebalanceResponse(portfolio: Portfolio): string {
    const cryptoValue = portfolio.holdings
      .filter((h) => h.assetType === 'crypto')
      .reduce((s, h) => s + h.currentValue, 0);
    const etfValue = portfolio.holdings
      .filter((h) => h.assetType === 'etf')
      .reduce((s, h) => s + h.currentValue, 0);
    const stockValue = portfolio.holdings
      .filter((h) => h.assetType === 'stock')
      .reduce((s, h) => s + h.currentValue, 0);

    const cryptoPct = ((cryptoValue / portfolio.totalValue) * 100).toFixed(1);
    const etfPct = ((etfValue / portfolio.totalValue) * 100).toFixed(1);
    const stockPct = ((stockValue / portfolio.totalValue) * 100).toFixed(1);

    const losers = portfolio.holdings
      .filter((h) => h.gainLoss < 0)
      .map((h) => h.ticker)
      .join(' and ');

    return (
      `Here's your current allocation breakdown: stocks ${stockPct}%, ETFs ${etfPct}%, crypto ${cryptoPct}%. ` +
      `${parseFloat(cryptoPct) > 15 ? `Your crypto exposure at ${cryptoPct}% is above the typical 10–15% guideline — consider trimming for risk management. ` : `Your crypto allocation looks balanced at ${cryptoPct}%. `}` +
      `${losers ? `Positions currently underwater — ${losers} — could be harvested for tax losses if you're in a taxable account. ` : ''}` +
      `Your VOO ETF allocation provides broad market diversification as a solid core. ` +
      `Would you like a more detailed rebalancing plan?`
    );
  }

  private cryptoExposureResponse(portfolio: Portfolio): string {
    const cryptoHoldings = portfolio.holdings.filter((h) => h.assetType === 'crypto');
    const cryptoValue = cryptoHoldings.reduce((s, h) => s + h.currentValue, 0);
    const cryptoPct = ((cryptoValue / portfolio.totalValue) * 100).toFixed(1);
    const cryptoTotal = this.fmt(cryptoValue);

    const details = cryptoHoldings
      .map((h) => {
        const w = ((h.currentValue / portfolio.totalValue) * 100).toFixed(1);
        const pct = this.fmtPct(h.gainLossPercent);
        return `${h.ticker} at ${w}% of portfolio (${pct})`;
      })
      .join(', and ');

    return (
      `Your total crypto exposure is ${cryptoTotal}, representing ${cryptoPct}% of your portfolio. ` +
      `You hold ${details}. ` +
      `${parseFloat(cryptoPct) > 20 ? `At ${cryptoPct}%, crypto is a significant portion — ensure this aligns with your risk tolerance. ` : `At ${cryptoPct}%, your crypto exposure is within a moderate range. `}` +
      `Crypto volatility can significantly impact your overall portfolio value. Would you like to discuss risk management strategies?`
    );
  }

  private fallbackResponse(message: string, portfolio: Portfolio): string {
    const total = this.fmt(portfolio.totalValue);
    const topHolding = [...portfolio.holdings].sort((a, b) => b.currentValue - a.currentValue)[0];
    const losers = portfolio.holdings.filter((h) => h.gainLoss < 0).map((h) => h.ticker);
    const lossStr = losers.length > 0 ? ` Positions with unrealized losses include ${losers.join(', ')}.` : '';

    return (
      `That's a great question. Looking at your portfolio, you're currently at ${total} across ${portfolio.holdings.length} positions. ` +
      `Your largest holding is ${topHolding.ticker} — ${topHolding.name} at ${this.fmt(topHolding.currentValue)}.` +
      lossStr +
      ` I can help you analyze performance, explore rebalancing options, or dig into any specific holding. What would you like to know more about?`
    );
  }

  // ── Formatting helpers ────────────────────────────────────────
  private fmt(value: number): string {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  private fmtChange(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
  }

  private fmtPct(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
}
