# 2. Shared Schema

All 12 branded theme files follow an **identical section skeleton** — only the hex values change:

```
── Surface colors        (bg, bgDark, bgLight, bgEdge, bg2..bg5, border,
                          dimText, mutedText, subtleText)
── Button base           (darkBtn, darkBtnL, darkBtnD)
── Accent                (mint, mintEdgeL, mintEdgeD)       ← "structural" accent
── Card / Cyan           (cyan, cyanL, cyanD)               ← "card" accent
── Misc                  (grayBtn/L/D, yellow, mintB, redB)
── Numpad / Login        (numpadChassis/L/D, pinFieldBg)
── Typography            (textPrimary, textSecondary)
── Scrims                (scrimWorking, scrimInterrupt, scrimGate)
── Overlay frames        (frameTransactional, frameInterruptDecision,
                          frameInterruptCritical)
── Embossed button       (embDarkBg, embGoldBg, embMintBg, embVermBg,
                          embGhostBg, embGoldLabel, embMintLabel,
                          embVermLabel, embEdge, embGoldEdge, embMintEdge,
                          embVermEdge)
── Category palette      (PIZZA, APPS, SUBS, SIDES, DRINKS)
```

## Notes

- This is a **convention-by-copy** contract — no TypeScript interface or JSDoc typedef enforces it.
- Each file is 86–91 lines; the uniform banner comments (`── Section ────`) are the structural signal.
- Missing keys silently fall through to the Terminal Glow defaults in `tokens.js` via `setTheme`'s merge behaviour.
- `categoryPalette` and `roles` are deep-merged (object), not replaced (`tokens.js:440`). Every other key is a scalar replacement.
