import { create_renderer } from '../renderer/Renderer.js';
import { BvhView } from '../renderer/BvhView.js';
import { prepare_scene } from '../renderer/SceneData.js';
import { prepare_bvh_debug } from '../renderer/BvhDebug.js';
import { get_camera_settings } from '../classes/Camera.js';
import { default_settings } from '../classes/GUI.js';

window.bvhResults = (async () => {
    const results = [];
    const check = (name, pass, value) => results.push({ name, pass, value });
    const scene = {
        objects: [{ type: 4, min: [-0.8, -0.3, -5], max: [0.4, 0.7, -4], mat: 0 }],
        materials: [{ type: 4, attenuation: [1, 1, 1], k: 1 }],
    };
    const canvas = document.getElementById('canvas');
    const overlay = document.getElementById('bvh');
    const view = new BvhView(overlay);
    const renderer = await create_renderer(canvas, { scenes: [scene], width: 320 });
    await renderer.loadScene(scene);
    const data = renderer.getBvhDebugData();
    check(
        'debug snapshot is cached, immutable and matches uploaded geometry',
        renderer.getBvhDebugData() === data &&
            Object.isFrozen(data) &&
            data.leaves.length === 1 &&
            data.nodes[0].bounds.every((v, i) => Math.abs(v - [-0.8, 0.4, -0.3, 0.7, -5, -4][i]) < 1e-12),
    );
    try {
        await renderer.loadScene({ ...scene, objects: [...scene.objects, ...scene.objects] });
    } catch {
        /* capacity rejection */
    }
    check('failed scene upload retains the previous debug snapshot', renderer.getBvhDebugData() === data);
    const camera = get_camera_settings(
        { ...default_settings, cam_z: 0, at_z: -4, vfov: 60, background: [0, 0, 0], defocus_angle: 0 },
        320,
        180,
    );
    renderer.setCamera(camera);
    await renderer.reset();
    for (let i = 0; i < 16; i++) await renderer.renderSample();
    view.draw(data, camera, { mode: 'overlay', selection: 'leaves', depth: 0 }, 320, 180);
    const ctx = overlay.getContext('2d');
    const image = ctx.getImageData(0, 0, 320, 180).data;
    // Read the persistent GPU pixel field: WebGPU's swapchain backing store can be
    // discarded after presentation, making drawImage(canvas) nondeterministically black.
    const pixels = await renderer.pixels();
    const rendered = new Uint8ClampedArray(320 * 180 * 4);
    for (let y = 0; y < 180; y++) {
        for (let x = 0; x < 320; x++) {
            const i = Math.floor(((x + 0.5) / 320) * 319);
            const j = Math.floor((1 - (y + 0.5) / 180) * 179);
            rendered[4 * (y * 320 + x)] = pixels[i][j][0] * 255;
        }
    }
    const extent = (pixels, visible) => {
        const xs = [];
        const ys = [];
        for (let y = 0; y < 180; y++)
            for (let x = 0; x < 320; x++)
                if (visible(pixels, 4 * (y * 320 + x))) {
                    xs.push(x);
                    ys.push(y);
                }
        return xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null;
    };
    const renderBounds = extent(rendered, (p, i) => p[i] > 100);
    const debugBounds = extent(image, (p, i) => p[i + 3] > 100);
    check(
        'BVH outline aligns with an asymmetric rendered box, including the vertical axis',
        !!renderBounds && !!debugBounds && renderBounds.every((v, i) => Math.abs(v - debugBounds[i]) <= 2),
        { renderBounds, debugBounds },
    );
    const alphaBefore = image.filter((_, i) => i % 4 === 3).reduce((sum, value) => sum + value, 0);
    // If an unchanged view is redrawn, this temporary observation of real Canvas calls detects it.
    const clear = ctx.clearRect.bind(ctx);
    let clears = 0;
    ctx.clearRect = (...args) => {
        clears++;
        clear(...args);
    };
    view.draw(data, camera, { mode: 'overlay', selection: 'leaves', depth: 0 }, 320, 180);
    check('unchanged overlay is cached between samples', clears === 0 && alphaBefore > 0);
    view.clear();
    view.draw(data, camera, { mode: 'only', selection: 'level', depth: 0 }, 320, 180);
    check(
        'BVH-only view has an opaque background and leaves radiance samples intact',
        ctx.getImageData(0, 0, 1, 1).data[3] === 255 && renderer.samples === 16,
    );
    view.draw(null, camera, { mode: 'off' }, 320, 180);
    check('disabled BVH does not require data or draw on the canvas', overlay.hidden && clears === 1);
    const inside = get_camera_settings({ ...default_settings, cam_x: -0.2, cam_y: 0.2, cam_z: -4.5, at_z: -8 }, 320, 180);
    view.draw(data, inside, { mode: 'only', selection: 'leaves', depth: 0 }, 320, 180);
    check('camera inside a BVH box remains renderable', !overlay.hidden);
    await renderer.loadScene({ objects: [], materials: [] });
    const empty = renderer.getBvhDebugData();
    check(
        'empty scene replaces the snapshot and draws zero boxes',
        empty !== data && view.draw(empty, camera, { mode: 'only', selection: 'level', depth: 2 }, 320, 180) === 0,
    );

    const timings = [];
    for (const count of [2000, 10000]) {
        const objects = Array.from({ length: count }, (_, i) => ({
            type: 1,
            center: [(i % 100) * 0.8 - 40, Math.floor(i / 100) * 0.8 - 40, -5 - (i % 7)],
            radius: 0.3,
            mat: 0,
        }));
        const tree = prepare_scene({ objects, materials: [{ type: 1 }] }).bvh;
        const debug = prepare_bvh_debug(tree);
        const overview = get_camera_settings({ ...default_settings, cam_z: 80, at_z: -5, vfov: 65 }, 1200, 675);
        const samples = [];
        for (let i = 0; i < 15; i++) {
            view.clear();
            const start = performance.now();
            view.draw(debug, overview, { mode: 'only', selection: 'leaves', depth: 0 }, 1200, 675);
            const elapsed = performance.now() - start;
            if (i >= 5) samples.push(elapsed);
        }
        samples.sort((a, b) => a - b);
        timings.push({
            objects: count,
            nodes: debug.nodes.length,
            width: 1200,
            height: 675,
            medianMs: samples[5],
            p95Ms: samples[9],
            samples,
        });
        check(
            `BVH leaf view handles ${count} objects without truncation`,
            debug.leaves.length === count && samples.every(Number.isFinite),
            timings.at(-1),
        );
    }
    window.bvhTimings = timings;
    view.draw(data, camera, { mode: 'overlay', selection: 'leaves', depth: 0 }, 320, 180);
    return results;
})();
