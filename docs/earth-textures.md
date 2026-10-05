# Image textures and Earth validation

The Earth preset uses the supplied day JPEG for surface color, night JPEG for city emission and normal TIFF for subtle relief. A textured Moon, the Sun and 80 deterministic distant stars frame the planet. The [NASA Moon map and credit](../res/moon/README.md) are included locally. See the [scene-definition example](../README.md#image-textures-relief-and-emission) for applying maps to spheres, quads and boxes.

Soft warm and cool offscreen lights make the surface readable. The composition uses artistic sizes, distances and fill lighting. The large elevation PNG remains available for height mapping; the preset uses one relief map rather than repeating terrain from two inputs.

## Verification

- `npm test`: 49 CPU checks, including image descriptors, map references, color conversion, border addressing and atlas reservation.
- `npm run lint` and `git diff --check`: clean.
- `npm run test:gpu`: 197/197 hardware kernel and browser checks, including seven image codecs, bilinear filtering, UV seams, rotated primitives, combined relief and emission. Regression checks cover geometric total internal reflection, millimeter-sized relief surfaces and retries after correcting oversized images.
- Browser integration exercises missing files, retained scene data after a failed load, corrected-file retries and rapid switching while TIFF decoding is pending.

## Performance

The composed preset was measured at 1200×675 on Intel gen-12lp with Chrome 154, fused tracing, five warmups and five series of ten samples. Median completed trace latency was 50.0 ms and frame latency 55.4 ms; fresh setup took 5.19 s. The larger scene contains 85 objects, including the stars. Raw measurements and the source fingerprint are in `artifacts/bench-earth-cinematic.json`; its screenshot is `artifacts/earth-cinematic-scene-9.png`.

### Initial night-only preset

The following measurements describe the earlier night-only preset, before adding the Sun, Moon and stars. They were recorded on Intel gen-12lp hardware with Chrome 154 at 1200×675, fused tracing, seed 123456789. Each scene used five warmups followed by five series of ten samples. Baseline `fe6b8d8` and feature runs used the same scene order (8, 4, 0); Earth followed in the feature run. Values below are median completed CPU+GPU latency, not GPU timestamp measurements or interactive FPS.

| Scene | Baseline trace, ms | Feature trace, ms | Feature frame, ms |
| --- | ---: | ---: | ---: |
| Fog Test (8) | 54.4 | 54.1 | 60.6 |
| Cornell (4) | 40.3 | 40.9 | 45.3 |
| Scene 0 | 34.9 | 31.4 | 36.0 |
| Earth (9) | — | 12.7 | 17.5 |

The fresh Earth renderer took 5.78 s to initialize: image decoding/upload took 3.00 s and scene upload plus lazy kernel compilation took 2.14 s. Subsequent switches reuse successful decodes, atlas entries and compiled kernels. Separate plain and mapped kernels keep relief branches out of existing scenes; light emission reuses the already sampled albedo. Independent runs showed substantial timing variation, so these measurements do not establish a universal speedup.

Raw measurements: `artifacts/bench-earth-baseline-paired.json` and `artifacts/bench-earth-feature-paired.json`. Feature source SHA-256 with normalized LF: `7df7b8fa29ce18d531f0adab4195778f5ed159c5146c43a9222c59273a63985b`.

## Current limits

Textures are configured in scene data. Relief changes shading normals; it does not displace geometry. Use opaque relief maps because browser canvas decoding discards RGB behind fully transparent pixels. TIFF requires standard top-left orientation and converts to RGBA8. The cumulative 4096×4096 atlas uses 128 MiB plus a reusable 4 MiB staging field; padded images must fit. Device-loss recovery follows the existing renderer contract and can require reloading the page.
