import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonSkeletonText,
  IonButton,
  IonButtons,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  trendingUpOutline,
  trendingDownOutline,
  walletOutline,
  chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { PortfolioService } from '../../../../core/services/portfolio.service';
import { Portfolio } from '../../../../core/models/portfolio.model';

interface ChartSegment {
  label: string;
  percent: number;
  value: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

@Component({
  selector: 'app-portfolio-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    NgClass,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonSkeletonText,
    IonButton,
    IonButtons,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
  ],
  templateUrl: './portfolio-dashboard.component.html',
  styleUrl: './portfolio-dashboard.component.scss',
})
export class PortfolioDashboardComponent implements OnInit {
  private readonly portfolioService = inject(PortfolioService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  portfolio = signal<Portfolio | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  displayValue = signal<number>(0);

  readonly skeletonItems = Array.from({ length: 5 });

  private readonly SEGMENT_COLORS: Record<string, string> = {
    stock: 'var(--app-accent)',
    crypto: '#f59e0b',
    etf: '#6366f1',
    bond: '#94a3b8',
  };

  private readonly SEGMENT_LABELS: Record<string, string> = {
    stock: 'Stocks',
    crypto: 'Crypto',
    etf: 'ETFs',
    bond: 'Bonds',
  };

  readonly chartSegments = computed<ChartSegment[]>(() => {
    const p = this.portfolio();
    if (!p) return [];

    const groups: Record<string, number> = {};
    for (const h of p.holdings) {
      groups[h.assetType] = (groups[h.assetType] ?? 0) + h.currentValue;
    }

    let cumulative = 0;
    return Object.entries(groups).map(([type, value]) => {
      const percent = value / p.totalValue;
      const startAngle = cumulative * 2 * Math.PI;
      cumulative += percent;
      const endAngle = cumulative * 2 * Math.PI;
      return {
        label: this.SEGMENT_LABELS[type] ?? type,
        percent,
        value,
        color: this.SEGMENT_COLORS[type] ?? '#8892a4',
        startAngle,
        endAngle,
      };
    });
  });

  private readonly _icons = addIcons({ alertCircleOutline, trendingUpOutline, trendingDownOutline, walletOutline, chatbubbleEllipsesOutline });

  openChat(): void {
    this.router.navigate(['/chat']);
  }

  ngOnInit(): void {
    this.loadPortfolio();
  }

  loadPortfolio(): void {
    this.loading.set(true);
    this.error.set(null);

    this.portfolioService
      .getPortfolio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.portfolio.set(data);
          this.loading.set(false);
          this.startCountUp(data.totalValue);
        },
        error: () => {
          this.error.set('Unable to load portfolio. Please check your connection and try again.');
          this.loading.set(false);
        },
      });
  }

  handleRefresh(event: CustomEvent): void {
    this.loading.set(true);
    this.error.set(null);

    this.portfolioService
      .getPortfolio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.portfolio.set(data);
          this.loading.set(false);
          this.startCountUp(data.totalValue);
          (event.target as HTMLIonRefresherElement).complete();
        },
        error: () => {
          this.error.set('Unable to load portfolio. Please check your connection and try again.');
          this.loading.set(false);
          (event.target as HTMLIonRefresherElement).complete();
        },
      });
  }

  private startCountUp(targetValue: number): void {
    const duration = 600;
    const intervalMs = 10;
    const steps = duration / intervalMs;
    const increment = targetValue / steps;
    let current = 0;
    let ticks = 0;

    const timer: ReturnType<typeof setInterval> = setInterval(() => {
      ticks++;
      current += increment;
      if (ticks >= steps) {
        this.displayValue.set(targetValue);
        clearInterval(timer);
      } else {
        this.displayValue.set(Math.round(current));
      }
    }, intervalMs);
  }

  arcPath(segment: ChartSegment): string {
    const cx = 100, cy = 100, r = 80, innerR = 52;
    const x1 = cx + r * Math.sin(segment.startAngle);
    const y1 = cy - r * Math.cos(segment.startAngle);
    const x2 = cx + r * Math.sin(segment.endAngle);
    const y2 = cy - r * Math.cos(segment.endAngle);
    const ix1 = cx + innerR * Math.sin(segment.startAngle);
    const iy1 = cy - innerR * Math.cos(segment.startAngle);
    const ix2 = cx + innerR * Math.sin(segment.endAngle);
    const iy2 = cy - innerR * Math.cos(segment.endAngle);
    const large = segment.endAngle - segment.startAngle > Math.PI ? 1 : 0;
    return [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  formatChange(amount: number, percent: number): string {
    const sign = amount >= 0 ? '+' : '';
    const amountStr = amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return `${sign}${amountStr} (${sign}${percent.toFixed(2)}%) today`;
  }

  assetTypeLabel(type: Portfolio['holdings'][number]['assetType']): string {
    const labels: Record<typeof type, string> = {
      stock: 'Stock',
      etf: 'ETF',
      crypto: 'Crypto',
      bond: 'Bond',
    };
    return labels[type];
  }
}
