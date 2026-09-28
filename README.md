# WebGPU path tracer

Browser JavaScript path tracer built on the vendored Taichi.js runtime. Requires a WebGPU-capable browser on localhost or HTTPS. Development tools require Node.js 22+ (validated with Node 24) and locally installed Google Chrome for automated GPU checks.

```sh
npm ci
npm start
npm test
npm run test:gpu
npm run lint
npm run bench
npm run bench:functions
```

`npm start` serves the repository with live reload. Source modules execute directly; no bundler/build step is required. GPU checks reject missing/software adapters instead of silently treating them as a hardware result. Test and benchmark pages are development tools only.

`npm run bench` measures completed CPU+GPU latency at 320×180. It warms up five samples, then records five series of ten samples. Use `-- --separate` to compare separate trace/tone kernels, or `-- --legacy` to measure the original implementation from Git. `BASELINE_REF` selects a historical revision; `BENCH_LABEL` names the output. Example in PowerShell:

```powershell
$env:BENCH_WIDTH = '1200'
$env:BENCH_SCENES = '0,1,4,6,7,8'
npm run bench
```

Raw JSON and canvas screenshots go to ignored `artifacts/`. See [review and recorded results](docs/performance-review.md).

## Organization and renderer contract

- `app.js`: GUI wiring and application startup. `classes/`: CPU math and GPU-compatible intersection/sampling helpers. `scenes.js`: the nine existing presets.
- `renderer/SceneData.js`: validation, world-space transforms, precomputed quad geometry and BVH preparation. Raw scene presets retain their existing format; GPU records are internal and now contain prepared world-space geometry.
- `renderer/Renderer.js`: field allocation, kernels and uploads. `renderer/RenderLoop.js`: the sole owner of asynchronous rendering and scene switching. Use one renderer per page and serialize its operations through the loop.

`create_renderer(canvas, { scenes, width, height, fused })` sizes reusable fields from the supplied scene set. `loadScene(scene)` prepares fresh data on every load and returns preparation/upload timings. `setCamera(camera)`, `reset()` and `renderSample()` configure and accumulate output. `RenderLoop.update({ scene, camera, spp })` replaces pending work; `stop()` cancels future frames. Updates should provide a new camera snapshot. Call `loadScene` to apply scene edits.

Field capacity is fixed for a renderer's lifetime. Larger scenes fail before upload; configure the intended scene set at creation. Taichi's runtime/kernel scope is global and its public API does not provide per-field disposal or a device-loss subscription. The application reuses fields and compiled kernels rather than repeatedly allocating renderers. Async failures stop rendering and appear in a recoverable status message.

CPU tests use Node's built-in runner; GPU tests run real Taichi kernels plus all preset scenes in Chrome. ESLint integrates Prettier: four spaces, single quotes, trailing commas, 140 columns. Vendored `lib/` files are excluded from formatting and remain unchanged.

## Boxes and participating media

A box is one analytic primitive and one BVH leaf. Its local corners can be supplied in either order; all three dimensions must be positive. Rotation uses degrees, around the local origin in X/Y/Z order, followed by translation.

```js
const boundary = {
    type: OBJ_TYPE.BOX,
    min: [0, 0, 0],
    max: [165, 165, 165],
    offset: [130, 0, 65],
    rotation: [0, -18, 0],
};
// Visible surface with an ordinary material:
const solid = { ...boundary, mat: 1 };
// Invisible boundary containing a scattering medium:
const fog = { type: OBJ_TYPE.MEDIUM, mat: 5, boundary };
// materials[5] = { type: MAT_TYPE.ISOTROPIC, attenuation: [1, 1, 1], k: 0.01 };
```

`MEDIUM.boundary` accepts `SPHERE` or `BOX`; put transforms on the boundary. Its material is ignored: the outer medium's material supplies attenuation and positive density `k`. Legacy flat sphere media remain supported, including `center2` motion. Arbitrary quad volumes are not supported yet. Add a separate surface object only when a visible shell is desired.

The old `get_box_q` generator was removed; replace its spread calls with single `BOX` records. Boxes in `lights` expand into six quad sampling targets internally. Reusable capacities include those targets and a separate `Boxes` geometry field. The low-level `init_scene` helper now takes the `Boxes` field as its last argument; application code should use `renderer.loadScene`.

See [BOX and fog validation](docs/box-medium.md) for tests, timings and the Fog Test image.
