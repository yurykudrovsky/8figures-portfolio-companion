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
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/components/chat-page/chat-page.component').then(
        (m) => m.ChatPageComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
