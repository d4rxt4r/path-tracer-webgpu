# Rendering review and performance results

The review covers all first-party modules, application orchestration, configuration and the used Taichi/GUI/Stats APIs. OBJ import, new geometry types, noise textures and a scene editor remain future work. Taichi.js, existing controls and production resolution (1200×675) are retained.

## Findings and implemented changes

| Area | Finding | Resolution and verification |
| --- | --- | --- |
| BVH | Sorting operated on a discarded array; original indices would also be lost by a naive sorting fix. Empty input crashed. | Sort cached centroid/index records; build terminating ropes; test cluster separation, original indices, empty scenes and GPU nearest hits against analytic and linear references. |
| Bounds/intersections | Bounds grew on every union; parallel rays on slab boundaries failed; clipped BVH intervals could exclude a sphere surface. | Pad only degenerate intervals, handle zero direction components, use the original ray interval for primitive tests. |
| Transform/motion | Zero-sum offsets/angles were treated as absent; negative motion endpoints were ignored; rotation was integer-typed. Light sampling did not apply object transforms. | Prepare all geometry/light targets in world coordinates on the CPU, including fractional rotations and complete motion endpoints. |
| Light PDF | Sphere misses returned 1; sampling from inside a sphere produced NaN; quad PDF subtracted 1; distant lights lost precision. Empty light sets were unsafe. | Analytic GPU tests cover these cases; use a rationalized solid angle and material-only sampling without lights. Clamp sampled light indices to the valid range. |
| Volume | Physical distance used squared direction length. Unsupported box boundaries silently behaved as incomplete media. | Direction magnitude invariance is tested statistically. Unsupported medium boundaries now fail validation explicitly. Box media remain future work. |
| Materials/textures | Repeated material/texture reads, inconsistent UV types and private struct introspection for defaults. | Scalar UVs, shared material/texture records, explicit upload defaults and precomputed quad normal/plane/area. |
| Camera/GUI | Degenerate/vertical camera bases, per-frame GUI serialization, no listener disposal, scene-setting callbacks firing while presets were copied. | Validate camera, choose a stable up axis, snapshot plain settings only on updates, abort listeners and suppress intermediate preset callbacks. |
| Rendering lifecycle | Scene changes reinitialized fields/kernels and started competing asynchronous render loops. FPS timings did not await GPU work. | Reuse one renderer, serialize frames, discard stale completion notifications and errors, stop at SPP, handle current asynchronous failures. A deferred-rejection regression protects newer requests. |
| Uploads/capacity | Per-record GPU transfers and fixed 1000-node/100-texture fields; 484 spheres already consumed 967 BVH nodes. | Full-sized padded batch uploads, capacity derived from scene set, texture slot zero included, validation before mutations and device storage-limit checks. |
| Tooling | No automated suite, reproducible benchmarks or pinned development server. | Node tests, real browser GPU checks, Chrome automation, lockfile, lint scripts and reproducible benchmark datasets. |

The critical field-layout experiment: placing read-only scene records alongside color accumulation made Taichi emit atomic loads for geometry and caused a large regression. Explicit `ti.materializeFields()` separates those groups using the public API. Direct non-atomic accumulation stores were tested and rejected because measured regressions were inconsistent across scenes. Fused trace/tone kernels won the six-scene frame comparison and are the default; the separate mode remains available for measurement.

## Measurement protocol

Hardware: Intel UHD, WebGPU architecture `gen-12lp`, Chrome 154, Windows, Node 24.11.1. Software adapters are rejected. Scene generation uses a fixed CPU seed (`123456789`); resolutions, camera presets, depth, light weight and sample counts match between compared runs. Each run starts in a fresh browser page; five warmups and fifty timed samples produce raw values, five series medians and p95. Image snapshots contain 55 accumulated samples including warmup; production SPP is unchanged.

Results measure **completed CPU+GPU latency**, including submission/synchronization overhead, not isolated GPU timestamps or nanosecond costs of JavaScript functions. GPU helper suites execute 8192 variable-input invocations and consume the output. They measure intersections/BVH, PDF/light sampling and sphere/disk sampling. Tiny function differences can be hidden by dispatch overhead. CPU BVH measurements use 128, 484, 2000 and 10,000 deterministic objects.

Three stages are distinguished: original `24ad391`; corrected mathematics `874466a`; optimized renderer. Optimization comparisons use the corrected stage rather than counting an erroneous renderer's speed as the quality baseline. Correctness changes can alter brightness, motion and fog; screenshots are examples, not pixel-equality promises for Monte Carlo images. Tests check analytic identities, finite raw radiance and statistical distributions.

See [measured results](performance/results.md), [image comparisons](performance/comparison.html), and raw JSON in `docs/performance/results/`. OS load, compilation caches and integrated-GPU power/thermal conditions affect timings; improvements should be rerun on another GPU before making a cross-device claim.

Cold initialization and warm rendering are separate measurements. Scene upload timings on the first load can include pending shader compilation: the vendored runtime synchronizes submitted work. A padded batch upload is not automatically cheaper to initialize for a tiny scene. The application pays that initialization once and reuses fields/kernels for subsequent camera and scene updates. Startup measurements include setup, the first reset, and the first completed frame; they exclude module download and page navigation.

## Independent review

One independent whole-change review found no critical issue and one important race: failure of an obsolete frame stopped a newer render request. The fix ignores obsolete errors and preserves the pending request; its CPU regression failed before the fix and passes afterward. The reviewer also requested hardware/provenance metadata for function benchmarks; those artifacts now include adapter, browser and current revision, and distinguish current GPU helpers from historical CPU BVH code. Cross-device performance, physical device loss and extreme geometry scales were explicitly left unverified.

The final native-application smoke check additionally exposed a browser callback binding error: calling stored animation-frame functions as RenderLoop methods changed their receiver. Default scheduling/cancellation now call through `globalThis`; a CPU regression reproduces the receiver contract and GUI recovery is checked in hardware Chrome. This validation also verifies scene controls and recovery after a degenerate camera.

## Remaining limits and next extension points

- Taichi's vendored runtime has no authoritative version metadata. Its exact SHA-256 is `65cf8e0af27376b99476676381c531ef118103b9a56b85b3dbbd96ef8fdb4e43`. All vendor files are unchanged; lil-gui reports 0.19.2. No unverified library upgrade or private runtime patch was introduced.
- Scene field capacity is fixed at startup; multiple renderer allocations are not a disposal strategy. The input scene must fit the declared scene set and WebGPU storage limits.
- The integrator retains the existing gamma approximation, fixed intersection epsilon, float32 precision and depth limit. Very small/large imported geometry will need scale-aware numerical policy when OBJ support is designed.
- Perlin Noise is an existing WIP preset using available texture types; this review does not implement noise, boxes, mesh intersections, adaptive sampling or denoising.
- Device absence and asynchronous renderer failures are handled; Taichi does not expose a public device-loss event subscription. Real forced device removal was not validated.
- The BVH uses balanced median splits and fixed left-first rope traversal. SAH, near-first traversal, alternate layouts and workgroup changes need separate measured experiments; they were not added on speculation.
