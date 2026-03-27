import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Portfolio, Holding } from '../models/portfolio.model';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getPortfolio(): Observable<Portfolio> {
    return this.http.get<Portfolio>(`${this.apiUrl}/portfolio`);
  }

  getHoldings(): Observable<Holding[]> {
    return this.http.get<Holding[]>(`${this.apiUrl}/portfolio/holdings`);
  }
}
