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

- `app.js`: GUI wiring and application startup. `classes/`: CPU math and GPU-compatible intersection/sampling helpers. `scenes.js`: ten presets, including Earth.
- `renderer/SceneData.js`: validation, world-space transforms, precomputed quad geometry and BVH preparation. Raw scene presets retain their existing format; GPU records are internal and now contain prepared world-space geometry.
- `renderer/Renderer.js`: field allocation, kernels and uploads. `renderer/RenderLoop.js`: the sole owner of asynchronous rendering and scene switching. Use one renderer per page and serialize its operations through the loop.

`create_renderer(canvas, { scenes, width, height, fused })` sizes reusable fields from the supplied scene set. `loadScene(scene)` prepares fresh data on every load and returns preparation/upload timings. `setCamera(camera)`, `reset()` and `renderSample()` configure and accumulate output. `RenderLoop.update({ scene, camera, spp })` replaces pending work; `stop()` cancels future frames. Updates should provide a new camera snapshot. Call `loadScene` to apply scene edits.

`RenderLoop` accepts an optional `onLoadingChange(boolean)` callback. Loading lasts until the first current-scene frame is presented; stale completions cannot dismiss a newer request. The application shows a loading status during startup and scene switches, clears it on errors, and keeps camera updates and sample accumulation unobstructed. The spinner respects reduced-motion preferences.

Quad surfaces remain two-sided; light emission is front-facing only. Existing presets depend on two-sided intersection, so global back-face culling is intentionally disabled.

Field capacity is fixed for a renderer's lifetime. Larger scenes fail before upload; configure the intended scene set at creation. Taichi's runtime/kernel scope is global and its public API does not provide per-field disposal or a device-loss subscription. The application reuses fields and compiled kernels rather than repeatedly allocating renderers. Async failures stop rendering and appear in a recoverable status message.

CPU tests use Node's built-in runner; GPU tests run real Taichi kernels plus all preset scenes in Chrome. ESLint integrates Prettier: four spaces, single quotes, trailing commas, 140 columns. Vendored `lib/` files are excluded from formatting. Existing libraries remain unchanged; image decoding adds pinned UTIF.js 3.1.0 and pako 1.0.11 with licenses under `lib/image-codecs/`.

## Image textures, relief and emission

Choose **Earth-mapped sphere** for a clearly lit Earth with day color, city emission, a subtle normal map, the Sun, a textured Moon and 80 distant stars. Soft offscreen lights keep the continents and oceans readable. Earth resources live in `res/earth/`; the Moon map and its NASA credit live in `res/moon/`. Textures are configured in scene definitions; there is no file-upload GUI yet.

```js
textures: [
    { type: TEX_TYPE.IMAGE, src: 'res/earth/2k_earth_nightmap.jpg', wrap_u: 'repeat' },
    { type: TEX_TYPE.IMAGE, src: 'res/earth/2k_earth_normal_map.tif', color_space: 'linear', wrap_u: 'repeat' },
    { type: TEX_TYPE.IMAGE, src: 'res/earth/2k_earth_daymap.jpg', wrap_u: 'repeat' },
],
materials: [{
    type: MAT_TYPE.LAMBERTIAN,
    tex: 3,
    normal_tex: 2, normal_scale: 1.2,
    emission_tex: 1, emission_strength: 0.75, emission_threshold: 0.007,
}],
```

Texture references are one-based; `0` disables a channel. Color textures replace material attenuation and also color `LIGHT` emission. Optional `emission_tex` adds front-facing self-emission to ordinary materials; its default strength is 1, and a linear-luminance threshold (default 0) suppresses dim pixels. It works without external lighting.

For height relief instead, replace texture 2 with `res/earth/World_elevation_map.png` using `color_space: 'linear'`, then set `normal_tex: 0`, `height_tex: 2` and `height_scale: 0.006`. Both inputs are supported, but the Earth preset uses one relief map to avoid applying the same terrain twice.

Images support PNG, JPEG, WebP, BMP, GIF, AVIF and TIFF in the target Chrome browser. Animated images and multipage TIFFs use the first image. TIFF decoding uses RGBA8 and requires standard top-left orientation. Paths resolve from the repository root. Decode failures include the source path and can be retried after correcting the file. PNG alpha does not make a material transparent. Use opaque relief maps: browser canvas decoding loses RGB hidden behind fully transparent pixels.

Color space defaults to `srgb`; conversion to linear RGB happens before GPU filtering. Set `color_space: 'linear'` for normal maps. Height uses raw RGB luminance in [0, 1], independently of color conversion. `wrap_u` and `wrap_v` accept `clamp` (default) or `repeat`; image top corresponds to UV `v=1`.

Maps work on sphere UVs, quad UVs and each BOX face. Rotation transports the image and tangent basis with the object. Normal maps use OpenGL tangent-space RGB (+green along +V). Height changes the shading normal, with `height_scale` in scene units; it does not change the silhouette, intersections or BVH. Both maps can be combined, normal first then height. Zero strength skips sampling. Longitude height derivatives are suppressed at sphere poles. Surface relief is not supported for isotropic volume materials.

`renderer.loadScene` decodes and caches maps before updating scene records. One reusable, bilinearly filtered RGBA16F atlas is 4096×4096 (128 MiB); padded images must fit its cumulative capacity, and each dimension is limited to 4094 pixels. Uploads reuse a 4 MiB staging field. Repeated scene switches reuse decoded data and atlas entries without allocating new GPU textures. Include image scenes in `create_renderer`'s `scenes` set so image kernels are enabled.

The renderer caches separate trace kernels for plain and mapped/emissive scenes. The first mapped scene compiles its kernel during loading; subsequent switches reuse it. Plain scenes skip the image and relief branches.

See [image texture validation and timings](docs/earth-textures.md) for recorded hardware checks and current limits.

## BVH inspection

Open the **BVH** GUI folder and choose **Render + BVH** for a transparent wireframe overlay, or **BVH only** for a dark-background view without path tracing. **Render** disables visualization. **Nodes → Level** shows one tree depth (root = 0); **Leaves** shows each object's bounding box. **Selected nodes** counts the selection, including boxes outside the camera view. Colors follow depth. The initial depth is 2, clamped to the scene's tree height; view settings survive scene changes.

The wireframe shows the actual acceleration bounds, including padding around quads, rotated-box world bounds, and the full motion bounds of moving spheres. Lines remain visible through geometry and use a pinhole camera, without depth-of-field blur. Camera controls work in all modes. Changing only BVH settings preserves accumulated samples; camera/scene changes invalidate them before tracing resumes. The overlay is redrawn only when its view changes.

`renderer.getBvhDebugData()` lazily returns a cached, immutable CPU snapshot (`nodes`, `levels`, `leaves`, `maxDepth`), replaced after a successful scene upload. `RenderLoop.update()` accepts optional `bvh: { mode: 'off' | 'overlay' | 'only', selection: 'level' | 'leaves', depth: number }`; its optional synchronous `onView(state)` callback paints the accepted view. Keep the same camera object for presentation-only updates. The disabled mode needs no debug snapshot, GPU readback, or extra drawing pass.

GPU/browser tests include silhouette alignment, all ten BVH presets, accumulation preservation, stale-camera handling and leaf views of 2,000/10,000 objects. `artifacts/gpu-validation.json` records projection and Canvas draw-submission timings at 1200 x 675 (five warmups, ten measurements); these exclude asynchronous compositing and are not full-frame latency or FPS. Screenshots are saved as `artifacts/bvh-only.png` and `artifacts/bvh-overlay.png`.

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
