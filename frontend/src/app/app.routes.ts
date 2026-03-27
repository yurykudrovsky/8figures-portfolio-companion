import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component').then(
        (m) => m.PortfolioDashboardComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
