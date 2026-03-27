import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import { Portfolio, Holding } from '../models/portfolio.model';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly http = inject(HttpClient);

  /**
   * Android Emulator routes host machine's localhost via 10.0.2.2.
   * iOS Simulator and browser can reach localhost directly.
   */
  private get apiUrl(): string {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      return environment.apiUrl.replace('localhost', '10.0.2.2');
    }
    return environment.apiUrl;
  }

  getPortfolio(): Observable<Portfolio> {
    return this.http.get<Portfolio>(`${this.apiUrl}/portfolio`);
  }

  getHoldings(): Observable<Holding[]> {
    return this.http.get<Holding[]>(`${this.apiUrl}/portfolio/holdings`);
  }
}
