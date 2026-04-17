# 10. Observations & Gaps

1. **No enforced contract.** The 12 branded themes replicate the same key set manually. A missing key silently falls through to Terminal Glow defaults — forgiving for edits, risky for subtle regressions. Adding a JSDoc typedef or a runtime validator in `setTheme()` would surface omissions.

2. **Semantic naming drift.** `mint` no longer means mint, `cyan` no longer means cyan. Renaming to `accentPrimary` / `accentSecondary` would match usage; downside is that 10+ scene files and the modifier / order-summary modules read `T.mint` / `T.cyan` directly, so it's a cross-cutting change.

3. **Light-surface support is Pizza-Palace-only.** `textPrimary` inversion works, but several fixed-color artefacts don't recolor:
   - `cardFilter()` at `theme-manager.js:56` bakes in `rgba(135,247,156,0.15)` (mint glow) regardless of theme.
   - Card bevel relies on `lightenHex` / `darkenHex` of `numpadChassis`; this still works on light surfaces but the ambient glow fights the cream background.

4. **Fixed category palette.** Five keys only (`PIZZA`, `APPS`, `SUBS`, `SIDES`, `DRINKS`). Adding a new top-level menu category means editing 13 files — or accepting the `T.mint` fallback in `T.catColor`.

5. **Text tokens are in the wrong section.** `dimText` / `mutedText` / `subtleText` live in the surface block but they're text colors. Moving them under `── Typography` alongside `textPrimary` / `textSecondary` would clarify intent.

6. **Implicit ghost label dependency.** The `ghost` embossed variant reuses `T.textPrimary` — fine in practice, but not called out as a token. Any future theme with an unusual `textPrimary` contrast should double-check ghost-button legibility.

7. **Copy-paste drift risk.** Since each theme is a hand-maintained copy of the same skeleton, small differences creep in — e.g. line counts range 86–91, suggesting minor per-theme additions (Rainbow adds `lavender/L/D`, Sammy's Pizza inlines typography comments). A shared template generator or a "theme lint" could flag drift.

8. **No per-theme font override hook.** If a theme wanted, say, a more decorative display face (Speakeasy → serif), there's no supported path short of setting `T.fh` globally, which would affect every theme installed.
