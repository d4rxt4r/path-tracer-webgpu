import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { openBrowser, seededPage, root, sourceProvenance } from './browser.mjs';

const fused = !process.argv.includes('--separate');
const legacy = process.argv.includes('--legacy');
const width = Number(process.env.BENCH_WIDTH || 320);
const scenes = (process.env.BENCH_SCENES || '0,1,4,6,7,8').split(',').map(Number);
await mkdir(resolve(root, 'artifacts'), { recursive: true });
const run = await openBrowser();
const output = {
    ...sourceProvenance(),
    kind: process.env.BENCH_LABEL || (legacy ? 'original' : 'current'),
    revision: legacy ? process.env.BASELINE_REF || '24ad391' : execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
    width,
    height: Math.floor((width * 9) / 16),
    mode: legacy ? 'separate' : fused ? 'fused' : 'separate',
    seed: 123456789,
    warmup: 5,
    series: 5,
    samplesPerSeries: 10,
    results: [],
};
try {
    for (const scene of scenes) {
        const page = await seededPage(run.browser);
        await page.goto(
            `${run.origin}/${legacy ? 'legacy/index.html' : 'tests/bench.html'}?width=${width}&scene=${scene}${fused ? '&fused=1' : ''}`,
        );
        await page.waitForFunction(() => !!window.bench, { timeout: 120000 });
        const result = await page.evaluate(async (historical) => {
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter || adapter.info.isFallbackAdapter) throw new Error('Hardware WebGPU adapter required');
            const bench = window.bench;
            const times = { reset: [], trace: [], tone: [], present: [], frame: [] };
            let firstFrameMs;
            const resetStarted = performance.now();
            await bench.reset();
            const initialResetMs = performance.now() - resetStarted;
            for (let i = 0; i < 55; i++) {
                const frameStart = performance.now();
                for (const key of ['trace', 'tone', 'present']) {
                    const start = performance.now();
                    await bench[key](i + 1);
                    if (i >= 5) times[key].push(performance.now() - start);
                }
                if (i === 0) firstFrameMs = performance.now() - frameStart;
                if (i >= 5) times.frame.push(performance.now() - frameStart);
            }
            const colors = (await bench.colors()).flat(2);
            const nonFiniteRadiance = colors.filter((v) => !Number.isFinite(v)).length;
            if (!historical && (nonFiniteRadiance || !colors.some((v) => v > 0))) throw new Error('Invalid accumulated radiance');
            const radianceMean = nonFiniteRadiance ? null : colors.reduce((a, b) => a + b, 0) / colors.length / 55;
            for (let i = 0; i < 50; i++) {
                const start = performance.now();
                await bench.reset();
                times.reset.push(performance.now() - start);
            }
            const metrics = Object.fromEntries(
                Object.entries(times).map(([key, values]) => {
                    const sorted = [...values].sort((a, b) => a - b);
                    return [
                        key,
                        {
                            medianMs: sorted[25],
                            p95Ms: sorted[47],
                            seriesMedianMs: Array.from(
                                { length: 5 },
                                (_, s) => [...values.slice(s * 10, s * 10 + 10)].sort((a, b) => a - b)[5],
                            ),
                            values,
                        },
                    ];
                }),
            );
            return {
                adapter: { vendor: adapter.info.vendor, architecture: adapter.info.architecture },
                browser: navigator.userAgent,
                setupMs: bench.setupMs,
                firstFrameMs,
                initialResetMs,
                startupToFirstFrameMs: bench.setupMs + initialResetMs + firstFrameMs,
                loadTimings: bench.loadTimings,
                radianceMean,
                nonFiniteRadiance,
                metrics,
            };
        }, legacy);
        output.results.push({ scene, ...result });
        console.log(
            `scene ${scene}: setup ${result.setupMs.toFixed(1)}ms, trace ${result.metrics.trace.medianMs.toFixed(2)}ms, frame ${result.metrics.frame.medianMs.toFixed(2)}ms`,
        );
        await page
            .locator('canvas#canvas')
            .screenshot({ path: resolve(root, `artifacts/${output.kind}-scene-${scene}.png`) })
            .catch(() => {});
        await page.close();
    }
} finally {
    await mkdir(resolve(root, 'artifacts'), { recursive: true });
    await writeFile(resolve(root, `artifacts/bench-${output.kind}.json`), JSON.stringify(output, null, 2));
    await run.close();
}
