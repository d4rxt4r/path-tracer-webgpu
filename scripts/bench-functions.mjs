import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser, seededPage, root, sourceProvenance } from './browser.mjs';
import { resolve } from 'node:path';

const run = await openBrowser();
const results = {
    historicalRef: process.env.BASELINE_REF || '24ad391',
    ...sourceProvenance(),
    gpuSource: 'current checkout; historicalRef applies only to CPU BVH comparison',
    warmup: 5,
    samples: 50,
};
try {
    const page = await seededPage(run.browser);
    await page.goto(`${run.origin}/tests/micro.html`);
    await page.waitForFunction(() => !!window.micro, { timeout: 120000 });
    Object.assign(
        results,
        await page.evaluate(async () => {
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter || adapter.info.isFallbackAdapter) throw new Error('Hardware WebGPU adapter required');
            return {
                adapter: { vendor: adapter.info.vendor, architecture: adapter.info.architecture },
                browser: navigator.userAgent,
            };
        }),
    );
    results.gpu = await page.evaluate(async () => {
        const result = {};
        for (const key of ['intersections', 'sampling', 'pdf']) {
            for (let i = 0; i < 5; i++) await window.micro[key]();
            const values = [];
            for (let i = 0; i < 50; i++) {
                const start = performance.now();
                await window.micro[key]();
                values.push(performance.now() - start);
            }
            const output = (await window.micro.read()).flat();
            if (!output.every(Number.isFinite)) throw new Error(`${key}: non-finite output`);
            const sorted = [...values].sort((a, b) => a - b);
            result[key] = { invocations: 8192, medianMs: sorted[25], p95Ms: sorted[47], values };
        }
        return result;
    });
    results.cpu = await page.evaluate(async () => {
        const current = await import('/classes/BVHTree.js');
        const original = await import('/legacy/classes/BVHTree.js');
        const result = [];
        for (const [kind, module] of [
            ['historical', original],
            ['current', current],
        ]) {
            const { build_bvh_from_obj } = module;
            for (const count of [128, 484, 2000, 10000]) {
                const objects = Array.from({ length: count }, (_, i) => ({
                    type: 1,
                    center: [((i * 73) % 1021) - 500, ((i * 31) % 503) - 250, ((i * 17) % 509) - 250],
                    radius: 0.2,
                }));
                for (let i = 0; i < 5; i++) build_bvh_from_obj(objects);
                const values = [];
                for (let i = 0; i < 50; i++) {
                    const start = performance.now();
                    build_bvh_from_obj(objects);
                    values.push(performance.now() - start);
                }
                const sorted = [...values].sort((a, b) => a - b);
                result.push({ kind, objects: count, nodes: 2 * count - 1, medianMs: sorted[25], p95Ms: sorted[47], values });
            }
        }
        return result;
    });
    console.log(
        JSON.stringify({
            gpu: Object.fromEntries(Object.entries(results.gpu).map(([k, v]) => [k, v.medianMs])),
            cpu: results.cpu.map((r) => ({ objects: r.objects, medianMs: r.medianMs })),
        }),
    );
} finally {
    await mkdir(resolve(root, 'artifacts'), { recursive: true });
    await writeFile(
        resolve(root, `artifacts/bench-functions-${process.env.BENCH_LABEL || 'original'}.json`),
        JSON.stringify(results, null, 2),
    );
    await run.close();
}
