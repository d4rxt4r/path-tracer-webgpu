import { openBrowser, seededPage, sourceProvenance } from './browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { check_loading } from './loading-checks.mjs';
import { check_bvh_controls } from './bvh-checks.mjs';
import { check_image_loading } from './image-checks.mjs';
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
    const images = await seededPage(run.browser);
    await images.goto(`${run.origin}/tests/image-gpu.html`);
    results.push(...(await images.evaluate(() => window.imageResults)));
    await images.close();
    const boxes = await seededPage(run.browser);
    await boxes.goto(`${run.origin}/tests/box-gpu.html`);
    results.push(...(await boxes.evaluate(() => window.boxResults)));
    await boxes.close();
    const bvh = await seededPage(run.browser);
    await bvh.goto(`${run.origin}/tests/bvh-view.html`);
    results.push(...(await bvh.evaluate(() => window.bvhResults)));
    await bvh.close();
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
    results.push(...(await check_loading(run)));
    results.push(...(await check_bvh_controls(run)));
    results.push(...(await check_image_loading(run)));
    const unsupported = await seededPage(run.browser, ['does not support WebGPU']);
    await unsupported.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
    await unsupported.goto(run.origin);
    await unsupported.getByRole('alert').waitFor();
    results.push({
        name: 'unsupported WebGPU shows a clear application error',
        pass: (await unsupported.getByRole('alert').textContent()).includes('WebGPU'),
    });
    results.push({
        name: 'unsupported WebGPU clears loading and busy status',
        pass:
            !(await unsupported.locator('#scene-loading').isVisible()) &&
            (await unsupported.locator('#render-viewport').getAttribute('aria-busy')) === 'false',
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
