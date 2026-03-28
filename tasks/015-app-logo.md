# Task 015 — App Logo & Launch Screen
## Agent: ARCHITECT → BUILDER → REVIEWER
## Source: inbox/ — logo image provided by Engineering Director
## Branch: pipeline/006-app-logo
## Integration Boundary: Native only (iOS + Android)

## Objective
Replace default Capacitor app icon and launch screen with
8FIGURES brand logo on both iOS and Android platforms.

## Acceptance Criteria
- AC-1: iOS app icon replaced on all required sizes
- AC-2: Android app icon replaced on all required sizes
- AC-3: iOS launch screen shows logo centered on dark background
- AC-4: Android splash screen shows logo centered on dark background
- AC-5: App name shows "8FIGURES" on both platforms

## Logo Source
Read the logo file from inbox/8figures-logo.png.
Logo should be on dark background #0a0a0f to match Bloomberg theme.

## Technical Approach
- Use @capacitor/assets for icon and splash generation
- Or manually place in ios/App/App/Assets.xcassets/
- And android/app/src/main/res/

## Definition of Done
- iOS simulator shows 8FIGURES icon
- Android emulator shows 8FIGURES icon
- Launch screens updated
- No build errors
