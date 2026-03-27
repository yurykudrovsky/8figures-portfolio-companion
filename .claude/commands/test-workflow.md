# Test Workflow Skill

Use this skill when writing or reviewing unit tests for this project. The frontend uses **Vitest 4** via Angular's `@angular/build:unit-test` builder. Run tests with `npx ng test --watch=false` from the `frontend/` directory.

## Test Runner Setup

| Config file | Purpose |
|---|---|
| `vitest.config.ts` | Ionic ESM alias + `deps.inline` for node_modules transform |
| `tsconfig.spec.json` | Extends root tsconfig, adds `vitest/globals` types |
| `angular.json` → `test.runnerConfig` | Points to `vitest.config.ts` |

The `@ionic/core/components` directory import is a known ESM issue. The alias in `vitest.config.ts` patches it. Never remove that config without understanding the consequence.

## When to Write Tests

Write tests for:
- **Services** — all business logic, HTTP calls, computed values, error paths
- **Pure functions** — formatting helpers, data transforms

Skip tests for:
- Components (integration-tested via simulators)
- Interface/type declarations

## Service Test Template

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();   // asserts no unexpected HTTP requests were made
    vi.clearAllMocks();
  });

  it('calls the correct URL', () => {
    service.getData().subscribe();
    const req = httpMock.expectOne('/api/data');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1 });
  });
});
```

## Mocking `@capacitor/core`

`PortfolioService` uses `Capacitor.isNativePlatform()` and `Capacitor.getPlatform()`. Mock them at the top of the spec (Vitest hoists `vi.mock`):

```typescript
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

import { Capacitor } from '@capacitor/core';

beforeEach(() => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
});
```

## Testing RxJS Streams (ChatService streaming pattern)

Use `vi.useFakeTimers()` to control `setInterval` without waiting real time:

```typescript
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('emits all characters and completes', () => {
  const chars: string[] = [];
  let done = false;

  service.streamResponse('Hi').subscribe({
    next: (c) => chars.push(c),
    complete: () => (done = true),
  });

  vi.runAllTimers();   // fast-forward through all setInterval ticks
  expect(chars.join('')).toBe('Hi');
  expect(done).toBe(true);
});
```

For step-by-step assertions use `vi.advanceTimersByTime(15)` per character.

## What Every Service Test Suite Must Cover

- [ ] Happy path — correct URL, correct response shape
- [ ] Error path — HTTP error propagates to caller
- [ ] Platform variants (if service uses `Capacitor.getPlatform()`)
- [ ] Boundary conditions (empty input, zero values)
- [ ] Cleanup — `httpMock.verify()` after each test

## Running Tests

```bash
# From frontend/ directory:
npx ng test --watch=false          # run once, exit
npx ng test                        # watch mode (re-runs on save)
npx ng test --reporter=verbose     # detailed output per test
```

Tests must pass before every commit. Add to pre-commit gate:
```bash
cd frontend && npx ng test --watch=false
```
