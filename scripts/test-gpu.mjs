import { openBrowser, seededPage, sourceProvenance } from './browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const run = await openBrowser();
try {
    const page = await seededPage(run.browser);
    await page.goto(`${run.origin}/tests/gpu.html`);
    const adapter = await page.evaluate(async () => {
        const a = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
        return a ? { vendor: a.info.vendor, architecture: a.info.architecture, fallback: a.info.isFallbackAdapter } : null;
    });
    if (!adapter || adapter.fallback) throw new Error('Hardware WebGPU adapter required');
    console.log('Adapter:', JSON.stringify(adapter));
    const results = await page.evaluate(() => window.gpuResults);
    const boxes = await seededPage(run.browser);
    await boxes.goto(`${run.origin}/tests/box-gpu.html`);
    results.push(...(await boxes.evaluate(() => window.boxResults)));
    await boxes.close();
    const integration = await seededPage(run.browser);
    await integration.goto(`${run.origin}/tests/integration.html`);
    results.push(...(await integration.evaluate(() => window.integrationResults)));
    const fusedMeans = await integration.evaluate(() => window.imageMeans);
    const separate = await seededPage(run.browser);
    await separate.goto(`${run.origin}/tests/integration.html?separate=1`);
    results.push(...(await separate.evaluate(() => window.integrationResults)));
    const separateMeans = await separate.evaluate(() => window.imageMeans);
    results.push({
        name: 'fused/separate radiance agrees across three independent accumulations',
        pass: fusedMeans.every((mean, i) => Math.abs(mean - separateMeans[i]) < Math.max(mean, 1e-6) * 0.03),
        value: JSON.stringify({ fusedMeans, separateMeans }),
    });
    await integration.close();
    await separate.close();
    for (const count of [2000, 10000]) {
        const stress = await seededPage(run.browser);
        await stress.goto(`${run.origin}/tests/stress.html?count=${count}`);
        results.push(await stress.evaluate(() => window.stressResults));
        await stress.close();
    }
    const app = await seededPage(run.browser, ['Invalid camera settings']);
    const appErrors = [];
    app.on('pageerror', (error) => appErrors.push(error.stack));
    app.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('Invalid camera settings')) appErrors.push(msg.text());
    });
    await app.goto(run.origin);
    await app.evaluate(async () => {
        const ti = await import('/lib/taichi.js');
        const present = ti.Canvas.prototype.setImage;
        window.presented = 0;
        ti.Canvas.prototype.setImage = async function (...args) {
            await present.apply(this, args);
            window.presented++;
        };
    });
    await app.waitForFunction(() => window.presented > 0, { timeout: 120000 });
    const control = (name) => app.locator('.controller').filter({ has: app.getByText(name, { exact: true }) });
    const number = async (name, value) => {
        const input = control(name).locator('input[type="text"]');
        await input.fill(String(value));
        await input.press('Enter');
    };
    await number('spp', 2);
    await control('scene').locator('select').selectOption({ label: 'Cornell Box (Fog Test)' });
    await number('cam_z', 0);
    await app.getByRole('alert').waitFor();
    await number('cam_z', -800);
    await app.getByRole('alert').waitFor({ state: 'hidden', timeout: 120000 });
    results.push({
        name: 'native application controls switch scenes and recover from invalid camera settings',
        pass: appErrors.length === 0,
        value: appErrors.join('\n'),
    });
    await app.close();
    const unsupported = await seededPage(run.browser, ['does not support WebGPU']);
    await unsupported.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
    await unsupported.goto(run.origin);
    await unsupported.getByRole('alert').waitFor();
    results.push({
        name: 'unsupported WebGPU shows a clear application error',
        pass: (await unsupported.getByRole('alert').textContent()).includes('WebGPU'),
    });
    await unsupported.close();
    await mkdir('artifacts', { recursive: true });
    await writeFile(
        'artifacts/gpu-validation.json',
        JSON.stringify(
            {
                ...sourceProvenance(),
                adapter,
                browser: await page.evaluate(() => navigator.userAgent),
                results,
            },
            null,
            2,
        ),
    );
    for (const result of results)
        console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}${result.value === undefined ? '' : ': ' + result.value}`);
    if (results.some((result) => !result.pass)) process.exitCode = 1;
} finally {
    await run.close();
}
