# 7. Shared Overlay & Scrim System

## Scrim opacities (shared values)

Three tiers defined once in `tokens.js:122–124`, tinted per theme by overriding the rgba base with the theme's `bgDark`:

| Token | Opacity | Purpose |
|-------|---------|---------|
| `scrimWorking` | 0.60 | working-state dimmer |
| `scrimInterrupt` | 0.85 | interrupt / decision overlay |
| `scrimGate` | 1.00 | hard gate (full cover) |

Every theme supplies its own three rgba strings — e.g. Steakhouse `rgba(42, 24, 0, *)`, Neon Diner `rgba(10, 10, 26, *)`. This keeps modals feeling native instead of a generic black wash.

## Overlay frame slots

Three frame colors used by transactional / interrupt UIs:

| Token | Default (`tokens.js:134`) | Role |
|-------|----------|------|
| `frameTransactional` | `#C6FFBB` (mint) | routine transactional flows |
| `frameInterruptDecision` | `#fcbe40` (gold) | decision prompts |
| `frameInterruptCritical` | `#da331c` (red) | critical / destructive |

Every branded theme overrides all three — most themes set `frameTransactional` to their brand hero (`mint`), keep `frameInterruptDecision` on a gold family, and set `frameInterruptCritical` to the theme's red or hero.

## Z-layer contract

Defined once in `tokens.js:127–131` — themes do not override:

| Token | Value |
|-------|-------|
| `zWorking` | 10 |
| `zTransactional` | 20 |
| `zSummary` | 25 |
| `zInterrupt` | 30 |
| `zGate` | 100 |
