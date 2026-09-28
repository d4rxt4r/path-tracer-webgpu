import { create_renderer } from '../renderer/Renderer.js';
import { default_settings } from '../classes/GUI.js';
import { get_camera_settings } from '../classes/Camera.js';

window.stressResults = (async () => {
    const count = Number(new URLSearchParams(location.search).get('count'));
    const scene = {
        objects: Array.from({ length: count }, (_, i) => ({
            type: 1,
            center: [(i % 100) * 0.8 - 40, Math.floor(i / 100) * 0.8 - 40, -5 - (i % 7)],
            radius: 0.3,
            mat: 0,
        })),
        materials: [{ type: 1, attenuation: [0.8, 0.8, 0.8] }],
    };
    const renderer = await create_renderer(document.getElementById('canvas'), { scenes: [scene], width: 160 });
    const timings = await renderer.loadScene(scene);
    renderer.setCamera(get_camera_settings({ ...default_settings, max_depth: 2 }, 160, 90));
    await renderer.reset();
    for (let i = 0; i < 5; i++) await renderer.renderSample();
    const frameTimes = [];
    for (let i = 0; i < 50; i++) {
        const start = performance.now();
        await renderer.renderSample();
        frameTimes.push(performance.now() - start);
    }
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const colors = (await renderer.colors()).flat(2);
    const reloadTimes = [];
    for (let i = 0; i < 50; i++) reloadTimes.push(await renderer.loadScene(scene));
    return {
        name: `hardware scene with ${count} primitives and ${2 * count - 1} BVH nodes`,
        pass: colors.every(Number.isFinite) && colors.some((v) => v > 0) && (await renderer.fields.COUNTER.toArray())[0] === count,
        timings,
        width: 160,
        height: 90,
        maxDepth: 2,
        warmup: 5,
        samples: 50,
        medianMs: sorted[25],
        p95Ms: sorted[47],
        frameTimes,
        reloadTimes,
    };
})();
