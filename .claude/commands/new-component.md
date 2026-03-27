# New Component Skill
When creating a new Angular component always:
1. Use standalone: true
2. Import IonHeader, IonToolbar, IonTitle, IonContent from @ionic/angular/standalone
3. Add proper TypeScript interfaces for all inputs
4. Include loading, error, and empty states
5. Use inject() for dependency injection, never constructor injection
6. Add takeUntilDestroyed() to all subscriptions
7. Use OnPush change detection strategy
