# Repository Guidelines

## Project Structure & Module Organization

This is a JavaScript path tracer using WebGPU through Taichi.js. `index.html` loads `app.js`, which initializes GPU fields, kernels, rendering, and controls. `classes/` contains geometry, materials, textures, camera logic, sampling, and BVH utilities. `scenes.js` defines scene presets; `const.js` holds shared constants and type identifiers. `lib/` contains vendored Taichi, Stats, and GUI libraries; avoid incidental edits there. `test.js` is a manual BVH diagnostic, and `todo.md` tracks planned work. There is no dedicated asset or automated test directory.

## Build, Test, and Development Commands

- `npm install`: install development dependencies.
- `npm start`: run the configured BrowserSync watcher (`npx browser-sync --watch`).
- `npx browser-sync start --server --watch`: explicitly serve the repository with live reload for browser checks.
- `npx eslint app.js scenes.js const.js classes/*.js test.js`: check first-party JavaScript using `eslint.config.mjs`.

There are no build or test scripts. Source modules run directly in the browser. Use a WebGPU-capable browser on localhost.

## Coding Style & Naming Conventions

Follow the ESLint/Prettier configuration: four-space indentation, single quotes, trailing commas, and a 140-character print width. Use ES module imports with explicit `.js` extensions. Match existing naming: PascalCase module files and types (`Camera.js`, `BVHNode`), snake_case computational helpers (`hit_sphere`), and uppercase constants (`OBJ_TYPE`). Keep rendering helpers in their corresponding modules. Register helpers required by GPU kernels through `ti.addToKernelScope` in `app.js`.

## Testing Guidelines

No automated framework or coverage threshold is configured. Validate changes in the browser: exercise affected scene presets, camera movement, GUI settings, and sample accumulation; inspect console errors and the FPS meter. For BVH diagnostics, load `test.js` from a temporary module page and inspect its console output. Record reproducible steps and expected results when fixing bugs.

## Commit & Pull Request Guidelines

History uses short descriptive subjects such as `fixed typo` and `added PDF calculations`, without a consistent Conventional Commits prefix. Keep commits focused and describe the behavior changed. Pull requests should explain the change, link relevant issues when available, and list validation steps. Include before/after screenshots for visual changes and browser/GPU details when reporting rendering or performance results.
