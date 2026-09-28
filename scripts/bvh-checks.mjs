import { seededPage } from './browser.mjs';

export async function check_bvh_controls(run) {
    const results = [];
    const page = await seededPage(run.browser, ['Invalid camera settings']);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('Invalid camera settings')) errors.push(message.text());
    });
    let start;
    const gate = new Promise((resolve) => {
        start = resolve;
    });
    await page.route('**/app.js', async (route) => {
        await gate;
        await route.continue();
    });
    const check = (name, pass, value) => results.push({ name, pass, value });
    const control = (name) => page.locator('.controller').filter({ has: page.getByText(name, { exact: true }) });
    const select = (name, label) => control(name).locator('select').selectOption({ label });
    const number = async (name, value) => {
        const input = control(name).locator('input[type="text"]');
        await input.fill(String(value));
        await input.press('Enter');
    };
    const settled = () =>
        page.waitForFunction(() => window.bvhTestLoop && !window.bvhTestLoop.busy && !window.bvhTestLoop.desired, undefined, {
            timeout: 120000,
        });
    const counters = () =>
        page.evaluate(() => ({ samples: window.bvhTestLoop.renderer.samples, traces: window.bvhTraces, snapshots: window.bvhSnapshots }));
    try {
        await page.goto(run.origin, { waitUntil: 'commit' });
        await page.locator('#canvas').waitFor();
        await page.evaluate(async () => {
            const { RenderLoop } = await import('/renderer/RenderLoop.js');
            const tick = RenderLoop.prototype.tick;
            window.bvhTraces = 0;
            window.bvhSnapshots = 0;
            RenderLoop.prototype.tick = async function () {
                if (!window.bvhTestLoop) {
                    window.bvhTestLoop = this;
                    const trace = this.renderer.trace.bind(this.renderer);
                    this.renderer.trace = (...args) => {
                        window.bvhTraces++;
                        return trace(...args);
                    };
                    const snapshot = this.renderer.getBvhDebugData.bind(this.renderer);
                    this.renderer.getBvhDebugData = () => {
                        window.bvhSnapshots++;
                        return snapshot();
                    };
                }
                return tick.call(this);
            };
        });
        start();
        await settled();
        const initial = await counters();
        check(
            'BVH starts disabled without requesting debug geometry',
            initial.snapshots === 0 && (await page.locator('#bvh-canvas').isHidden()),
        );
        await select('View', 'Render + BVH');
        await settled();
        check(
            'enabling BVH on a completed render preserves samples and avoids retracing',
            (await counters()).traces === initial.traces &&
                (await counters()).samples === initial.samples &&
                (await page.locator('#bvh-canvas').isVisible()),
        );
        await number('Depth', 0);
        await settled();
        check(
            'root depth shows exactly one node without retracing',
            (await control('Selected nodes').locator('input').inputValue()) === '1' && (await counters()).traces === initial.traces,
        );
        await select('View', 'BVH only');
        await select('Nodes', 'Leaves');
        await settled();
        check(
            'leaf selection disables depth and BVH-only avoids GPU tracing',
            (await control('Depth').locator('input[type="text"]').isDisabled()) && (await counters()).traces === initial.traces,
        );
        const presets = await page.evaluate(async () =>
            (await import('/scenes.js')).SCENE_LIST.map((scene) => ({ name: scene.name, count: scene.objects.length })),
        );
        for (const preset of presets) {
            await select('scene', preset.name);
            await settled();
            check(
                `BVH-only preset: ${preset.name}`,
                (await control('Selected nodes').locator('input').inputValue()) === String(preset.count) &&
                    (await control('View').locator('option:checked').textContent()) === 'BVH only' &&
                    (await counters()).traces === initial.traces &&
                    (await page.locator('#scene-loading').isHidden()),
            );
        }
        await select('scene', 'Cornell Box');
        await settled();
        await page.screenshot({ path: 'artifacts/bvh-only.png' });
        await number('cam_x', 300);
        await settled();
        check('camera motion redraws BVH-only without launching a path trace', (await counters()).traces === initial.traces);
        await number('spp', 1);
        await settled();
        await select('View', 'Render + BVH');
        await settled();
        const resumed = await counters();
        check(
            'returning from changed BVH camera and scene starts fresh accumulation',
            resumed.traces === initial.traces + 1 && resumed.samples === 1,
        );
        await page.screenshot({ path: 'artifacts/bvh-overlay.png' });
        await select('View', 'Render');
        await settled();
        check(
            'disabling BVH preserves the finished image',
            (await page.locator('#bvh-canvas').isHidden()) && (await counters()).traces === resumed.traces,
        );
        await select('View', 'Render + BVH');
        await settled();
        await page.evaluate(() => {
            const renderer = window.bvhTestLoop.renderer;
            const present = renderer.present;
            renderer.present = async () => {
                renderer.present = present;
                await present();
                await new Promise((resolve) => {
                    window.releaseBvhCameraFrame = resolve;
                });
            };
        });
        await number('cam_x', 301);
        await page.waitForFunction(() => window.releaseBvhCameraFrame, undefined, { timeout: 120000 });
        await number('cam_x', 302);
        check('a stale camera presentation cannot retain a wireframe from another camera', await page.locator('#bvh-canvas').isHidden());
        await page.evaluate(() => window.releaseBvhCameraFrame());
        await settled();
        check(
            'the latest camera presentation restores its wireframe',
            (await page.locator('#bvh-canvas').isVisible()) &&
                (await page.evaluate(() => window.bvhTestLoop.viewState.camera.camera_center_x === 302)),
        );
        await select('View', 'BVH only');
        await number('cam_x', 278);
        await number('cam_z', 0);
        await page.getByRole('alert').waitFor();
        check(
            'invalid debug camera clears overlay and loading',
            (await page.locator('#bvh-canvas').isHidden()) && (await page.locator('#scene-loading').isHidden()),
        );
        await number('cam_z', -800);
        await settled();
        check(
            'BVH recovers from camera errors',
            (await page.getByRole('alert').count()) === 0 && (await page.locator('#bvh-canvas').isVisible()),
        );
        await page.evaluate(async () => {
            const { SCENE_LIST } = await import('/scenes.js');
            const loop = window.bvhTestLoop;
            for (const index of [1, 4, 8])
                loop.update({
                    ...loop.desired,
                    scene: SCENE_LIST[index],
                    camera: loop.viewState.camera,
                    spp: 1,
                    bvh: { mode: 'only', selection: 'leaves', depth: 0 },
                });
        });
        await settled();
        check(
            'rapid BVH scene requests settle on the latest geometry',
            (await control('Selected nodes').locator('input').inputValue()) === String(presets[8].count) && errors.length === 0,
            errors,
        );
        return results;
    } finally {
        start();
        await page.close();
    }
}
