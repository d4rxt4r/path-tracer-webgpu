# BOX and medium implementation ledger

Approved design: analytic BOX surfaces; MEDIUM with sphere/BOX boundary; separate GPU box geometry; migrate presets preserving the user's black sphere/white box Fog composition and k=0.01. Arbitrary quad volumes remain future work.

- Baseline complete: scenes 0, 1, 4, 6 at 1200 x 675 on Intel hardware.
- CPU preparation/validation and GPU geometry complete; regression tests exercised before and after fixes.
- All presets migrated, preserving the user's Scene_8 composition. Final validation passed: 22 CPU tests, 110 hardware/browser checks and ESLint. Performance rerun completed on the reviewed code, with no median regression above 5% against the baseline.
- Independent final review complete: corrected a fabricated surface hit at the finite distance limit and added scattering-record assertions. The new distance regression failed before the correction and passed afterward on hardware.
- Source-root transfer complete; CPU tests, ESLint and diff whitespace checks pass in the original checkout. Existing AGENTS.md remains unchanged.

Ruling: implement in an isolated worktree containing the user's scenes.js edits, then transfer verified changes to the original checkout. No merge or push is needed.
