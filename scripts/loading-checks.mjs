import { seededPage } from './browser.mjs';

// Run the real application, holding presentation only to observe the loading lifecycle deterministically.
export async function check_loading(run) {
    const results = [];
    const app = await seededPage(run.browser, ['Invalid camera settings']);
    const errors = [];
    app.on('pageerror', (error) => errors.push(error.message));
    app.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('Invalid camera settings')) errors.push(msg.text());
    });
    let releaseModule;
    const moduleGate = new Promise((resolve) => {
        releaseModule = resolve;
    });
    await app.route('**/app.js', async (route) => {
        await moduleGate;
        await route.continue();
    });
    const loading = app.locator('#scene-loading');
    const viewport = app.locator('#render-viewport');
    const control = (name) => app.locator('.controller').filter({ has: app.getByText(name, { exact: true }) });
    const number = async (name, value) => {
        const input = control(name).locator('input[type="text"]');
        await input.fill(String(value));
        await input.press('Enter');
    };
    const check = (name, pass) => results.push({ name, pass });
    const hold = () =>
        app.evaluate(() => {
            window.holdNextPresent = true;
        });
    const waitHeld = () => app.waitForFunction(() => window.releasePresent, undefined, { timeout: 120000 });
    const release = () => app.evaluate(() => window.releasePresent());
    try {
        await app.goto(run.origin, { waitUntil: 'commit' });
        await app.locator('#canvas').waitFor();
        const exists = await loading.isVisible();
        check('loading status is visible before application initialization', exists);
        if (!exists) return results;
        check(
            'loading region exposes its busy status',
            (await viewport.getAttribute('aria-busy')) === 'true' && (await loading.getAttribute('role')) === 'status',
        );
        await app.emulateMedia({ reducedMotion: 'reduce' });
        check(
            'loading spinner respects reduced motion',
            (await loading.locator('.loading-spinner').evaluate((el) => getComputedStyle(el).animationName)) === 'none',
        );
        await app.emulateMedia({ reducedMotion: 'no-preference' });
        await app.evaluate(async () => {
            const ti = await import('/lib/taichi.js');
            const present = ti.Canvas.prototype.setImage;
            window.presented = 0;
            window.holdNextPresent = true;
            ti.Canvas.prototype.setImage = async function (...args) {
                if (window.holdNextPresent) {
                    window.holdNextPresent = false;
                    await new Promise((resolve) => {
                        window.releasePresent = () => {
                            window.releasePresent = null;
                            resolve();
                        };
                    });
                }
                await present.apply(this, args);
                window.presented++;
            };
        });
        releaseModule();
        await waitHeld();
        check('loading stays visible until the first frame is presented', await loading.isVisible());
        await release();
        await loading.waitFor({ state: 'hidden', timeout: 120000 });
        check('first presentation clears the busy status', (await viewport.getAttribute('aria-busy')) === 'false');
        // Stop at one sample so later held presentations belong to explicit GUI updates.
        const previous = await app.evaluate(() => window.presented);
        await number('spp', 1);
        await app.waitForFunction((count) => window.presented > count, previous, { timeout: 120000 });
        await hold();
        await control('scene').locator('select').selectOption({ label: 'Cornell Box (Fog Test)' });
        await waitHeld();
        check(
            'scene switching shows loading while the GUI stays usable',
            (await loading.isVisible()) && (await control('scene').locator('select').isEnabled()),
        );
        await app.screenshot({ path: 'artifacts/scene-loading.png' });
        await release();
        await loading.waitFor({ state: 'hidden', timeout: 120000 });
        await hold();
        await number('spp', 2);
        await waitHeld();
        check('settings and accumulation do not show scene loading', !(await loading.isVisible()));
        await release();
        await number('cam_z', 0);
        await app.getByRole('alert').waitFor();
        check(
            'invalid camera clears loading and busy state',
            !(await loading.isVisible()) && (await viewport.getAttribute('aria-busy')) === 'false',
        );
        await number('cam_z', -800);
        await app.getByRole('alert').waitFor({ state: 'hidden', timeout: 120000 });
        check('native application controls switch scenes and recover from invalid camera settings', errors.length === 0);
        return results;
    } finally {
        releaseModule();
        await app.close();
    }
}
