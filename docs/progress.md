# Performance review execution ledger

Approved plan: full first-party audit, correctness tests, Intel UHD benchmarks, Taichi.js retained, then measured refactoring.

1. Tooling and original baseline: complete (all nine hardware GPU scenes at 1200x675, six at 320x180, 50 completed samples per stage).
2. Mathematical corrections and regression tests: complete; CPU 16/16; GPU analytic PDF, parallel AABB, transforms, medium distributions and 24 BVH/linear checks pass.
3. Renderer lifecycle and batch uploads: complete; one render loop, immutable snapshot per update, fresh preparation on scene reload, all nine presets checked on hardware, capacity failures preserve counters.
4. Measured kernel optimizations and comparison: complete; world-space preparation, quad invariants, shared material/texture reads, CPU centroid caching; fused trace/tone selected by frame latency. Native scene medians improve 9-60% versus corrected mathematics; cold startup and small-resolution p95 regressions are recorded explicitly.
5. Whole-change independent review and final source-root verification: complete. Important stale-error race fixed with a failing/passing regression; native GUI verification also found/fixed animation-frame receiver binding. Source-root npm ci, 16 CPU tests, 77 hardware/browser checks, full lint and diff checks pass. Source fingerprints match the worktree; AGENTS.md and all vendor files are unchanged.

Rejected experiment: non-atomic accumulation stores showed inconsistent regressions and were reverted. The renderer retains compound accumulation. Field grouping regression was diagnosed from generated WGSL; explicit scene materialization prevents geometry reads becoming atomic.

Decisions: use the approved in-chat plan as the specification; retain AGENTS.md unchanged. Use an isolated worktree and transfer changes back after verification. CPU+GPU completed latency is the benchmark metric; no private runtime patching for timestamp queries.
