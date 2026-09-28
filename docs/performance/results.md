# Recorded performance results

Intel UHD (Intel WebGPU gen-12lp), hardware Chrome 154 on Windows; Node 24.11.1. One GPU run at a time. These are completed CPU+GPU latencies including synchronization, measured without the animation-frame delay. They are not UI FPS or isolated GPU timestamp measurements.

## Native resolution: 1200 × 675

Five warmups, five series of ten timed samples per scene; fixed CPU seed 123456789, preset camera/depth/light weights. Original: 24ad391. Corrected mathematics: 874466a. Optimized kernel source: 365e3cd; later changes fix lifecycle/tests/measurement, not these kernels. Raw JSON records exact revisions and 50 values for every metric.

The recorded Fog benchmarks and comparison images use density `k = 0.001`. The current Fog preset uses `k = 0.01` for both media, adjusted after these measurements. Historical results remain a snapshot; rerun the benchmark to measure the current preset.

| Scene | Original median ms | Corrected median ms | Optimized median ms | Reduction vs corrected | Corrected / optimized p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0: Test Scene | 167.4 | 134.2 | 53.7 | 60.0% | 140.5 / 70.2 |
| 1: Bouncing Spheres | 498.1 | 505.1 | 374.7 | 25.8% | 552.1 / 412.9 |
| 2: Perlin Noise (WIP) | 52.2 | 63.2 | 41.1 | 35.0% | 70.4 / 45.2 |
| 3: Quads Test | 24.0 | 29.1 | 22.0 | 24.4% | 33.0 / 27.3 |
| 4: Cornell Box | 74.6 | 100.8 | 75.8 | 24.8% | 111.5 / 85.5 |
| 5: Cornell Mirror | 68.6 | 88.4 | 77.3 | 12.6% | 95.4 / 82.8 |
| 6: Cornell Glass | 188.3 | 206.3 | 153.2 | 25.7% | 225.7 / 178.3 |
| 7: Cornell Stress | 269.4 | 349.9 | 301.8 | 13.7% | 385.2 / 313.4 |
| 8: Cornell Fog | 65.9 | 53.0 | 48.1 | 9.2% | 57.7 / 58.7 |

All nine optimized medians improve against corrected mathematics; no median regression exceeds 5%. Corrections themselves can increase workload by restoring valid hits/light PDFs. Original raw radiance contained non-finite components (Test Scene: 0; Bouncing Spheres: 261453; Perlin Noise (WIP): 27; Quads Test: 12; Cornell Box: 6; Cornell Mirror: 3; Cornell Glass: 0; Cornell Stress: 0; Cornell Fog: 3); corrected and optimized native runs contain zero. Invalid original output is retained as diagnostic evidence.

The optimized trace metric includes tone mapping; its tone metric is a no-op. Compare full frame latency to the separate-kernel baseline. Reset and presentation costs, p95, series medians, setup and initial upload timings remain in the raw files.

## Additional 320 × 180 comparison

| Scene | Corrected median ms | Optimized median ms | Reduction | Corrected / optimized p95 ms |
| --- | ---: | ---: | ---: | ---: |
| Test Scene | 13.7 | 11.4 | 16.8% | 24.1 / 20.1 |
| Bouncing Spheres | 37.7 | 26.2 | 30.5% | 50.5 / 32.6 |
| Cornell Box | 14.9 | 11.0 | 26.2% | 31.6 / 28.5 |
| Cornell Glass | 19.1 | 14.0 | 26.7% | 27.0 / 32.7 |
| Cornell Stress | 28.2 | 22.9 | 18.8% | 33.5 / 28.0 |
| Cornell Fog | 13.3 | 8.8 | 33.8% | 21.2 / 17.4 |

This smaller resolution exposes dispatch overhead. The original six-scene run is also saved; the optimized dataset uses the final sphere sampling implementation. Cornell Glass p95 regressed from 27.0 to 32.7 ms although its median improved; this dispatch-dominated tail varied across runs, while native Glass median and p95 both improve. Repeated experiments show OS/thermal/compiler-cache variability, so individual decimal values are not guarantees. The separate startup runs also repeat warm frame measurements: Test Scene corrected/optimized medians were 77.2/49.6 ms, Bouncing Spheres 487.6/389.5 ms, Fog 53.0/45.5 ms. The direction persists, but the largest percentage is sensitive to run conditions; these repeats are retained in the raw data.

## Cold startup and reuse

Separate three-scene measurements include setup, first reset, and first completed sample, excluding module download/navigation. First uploads can wait for shader compilation; setup alone is not an apples-to-apples upload measurement.

| Scene | Corrected startup ms | Optimized startup ms |
| --- | ---: | ---: |
| Test Scene | 1163.0 | 1701.0 |
| Bouncing Spheres | 8277.5 | 2004.6 |
| Cornell Fog | 1084.3 | 2191.9 |

Cold startup can regress for small scenes because the larger prepared/fused kernel must compile and padded fields must initialize. This tradeoff is retained for lower ongoing frame latency and reusable scene changes; cold startup is not claimed as a universal improvement. Large-scene batch loading replaces thousands of synchronized individual writes. See warmed reload timings below. Compiler/runtime optimization is a remaining extension point.

## Function and synthetic scene measurements

CPU balanced BVH construction, historical corrected versus current cached centroids/extent scans; five warmups and fifty samples. Timer resolution affects the smallest cases.

| Objects | Corrected median ms | Optimized median ms | Corrected / optimized p95 ms |
| --- | ---: | ---: | ---: |
| 128 | 0.3 | 0.2 | 0.7 / 0.8 |
| 484 | 1.5 | 0.9 | 2.4 / 1.7 |
| 2000 | 7.8 | 5.0 | 11.4 / 6.8 |
| 10000 | 88.7 | 40.6 | 101.2 / 45.7 |

Current GPU helper suites each execute 8192 variable-input invocations and consume finite output. Medians: intersections 3.6 ms (p95 4.6 ms); sampling 3.7 ms (p95 4.7 ms); pdf 3.5 ms (p95 4.5 ms). These are current-checkout throughput checks, not a historical GPU comparison; dispatch overhead masks tiny per-function differences. Historical CPU provenance is recorded separately.

Synthetic GPU scenes: 160 × 90, depth 2, five warmups/fifty completed samples; warmed reloads measured fifty times after rendering. These validate capacity and sustained work, not quality-equivalent comparisons with high-depth presets. BVH node counts are 3999 and 19999. The old fixed-capacity implementation cannot represent these scenes, so no historical GPU speed ratio is reported.

| Objects | Frame median ms | Frame p95 ms | Warm prepare median ms | Warm upload median ms |
| --- | ---: | ---: | ---: | ---: |
| 2000 | 7.8 | 10.0 | 5.1 | 87.0 |
| 10000 | 9.3 | 12.0 | 45.0 | 514.5 |

## Validation and images

16 CPU tests and 77 hardware/browser checks passed. GPU checks cover analytic intersections/PDFs, BVH versus linear/analytic nearest hits, parallel slabs, transformed quads, moving spheres, medium direction invariance and statistical sampling. Integration covers all nine scenes in both modes, three independent fused/separate image accumulations, scene switching, mutable reloads, capacity rejection, native application GUI camera-error recovery and unsupported WebGPU. The CPU suite covers current and stale asynchronous failures and browser scheduling receivers.

[Image comparisons](comparison.html) show original/corrected/optimized Test Scene, Bouncing Spheres and Fog at 320 × 180, 55 samples. These illustrate corrected rendering; they do not claim pixel equality after changed stochastic paths. Fused/separate mean radiance agrees across three independent eight-sample accumulations. See [audit and limitations](../performance-review.md) for findings, rejected experiments and independent review.

Raw measurements in [results/](results/) retain provenance, values and validation outputs. Reproduce with README commands; run comparison stages sequentially on an idle GPU. Results are specific to this Intel device/browser.

Final validation ran from the main repository after a clean dependency install. Its Git revision still identifies the original branch because implementation files were transferred as reviewable working changes; the artifact records `workingTreeDirty: true` and normalized first-party SHA-256 `39127b78d3651ffe7ae40f6f482df2b428cc925a7cae427293985c31c75e5800`, which matches the implementation worktree. CPU and lint outputs are included beside the GPU validation JSON.
