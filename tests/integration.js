import { SCENE_LIST } from '../scenes.js';
import { create_renderer } from '../renderer/Renderer.js';
import { RenderLoop } from '../renderer/RenderLoop.js';
import { default_settings } from '../classes/GUI.js';
import { get_camera_settings } from '../classes/Camera.js';

async function run() {
    const results = [];
    const renderer = await create_renderer(document.getElementById('canvas'), {
        scenes: SCENE_LIST,
        width: 160,
        fused: !new URLSearchParams(location.search).has('separate'),
    });
    const camera = (scene) => get_camera_settings({ ...default_settings, ...scene.camera }, 160, 90);
    for (const scene of SCENE_LIST) {
        const timings = await renderer.loadScene(scene);
        renderer.setCamera(camera(scene));
        await renderer.reset();
        await renderer.renderSample();
        const values = (await renderer.colors()).flat(2);
        results.push({
            name: `finite hardware render: ${scene.name}`,
            pass: renderer.samples === 1 && values.every(Number.isFinite) && values.some((v) => v > 0),
            timings,
        });
    }
    const frames = [];
    const loop = new RenderLoop(renderer, {
        schedule: (callback) => {
            frames.push(callback);
            return callback;
        },
        cancel: (callback) => {
            const index = frames.indexOf(callback);
            if (index >= 0) frames.splice(index, 1);
        },
        onError: (error) => {
            throw error;
        },
    });
    for (const index of [1, 4, 8]) loop.update({ scene: SCENE_LIST[index], camera: camera(SCENE_LIST[index]), spp: 2 });
    while (frames.length) await frames.shift()();
    results.push({
        name: 'rapid scene changes render only the latest state and stop at SPP',
        pass: renderer.samples === 2 && (await renderer.fields.COUNTER.toArray())[0] === 8,
    });
    const before = await renderer.fields.COUNTER.toArray();
    const firstObject = JSON.stringify(await renderer.fields.Scene.get([0]));
    const box = { type: 4, min: [-1, -1, -1], max: [1, 1, 1], mat: 0 };
    const materials = [{ type: 1, attenuation: [1, 1, 1] }];
    for (const [name, scene] of [
        ['box geometry', { objects: Array(renderer.fields.Boxes.dimensions[0] + 1).fill(box), materials }],
        ['expanded box lights', { objects: [box], lights: [box], materials }],
    ]) {
        let rejected = false;
        let message = '';
        try {
            await renderer.loadScene(scene);
        } catch (error) {
            message = error.message;
            rejected = /capacity/.test(error.message);
        }
        results.push({
            name: `${name} capacity rejected before changing scene or counters`,
            value: message,
            pass:
                rejected &&
                JSON.stringify(before) === JSON.stringify(await renderer.fields.COUNTER.toArray()) &&
                firstObject === JSON.stringify(await renderer.fields.Scene.get([0])),
        });
    }
    try {
        await renderer.loadScene({
            ...SCENE_LIST[0],
            objects: Array(renderer.fields.Scene.dimensions[0] + 1).fill(SCENE_LIST[0].objects[0]),
        });
        results.push({ name: 'oversized scene rejected', pass: false });
    } catch {
        results.push({
            name: 'oversized scene rejected before changing GPU counters',
            pass: JSON.stringify(before) === JSON.stringify(await renderer.fields.COUNTER.toArray()),
        });
    }
    try {
        await renderer.tone(0);
        results.push({ name: 'zero samples rejected', pass: false });
    } catch {
        results.push({ name: 'zero samples rejected', pass: true });
    }
    const mutable = { objects: [{ type: 1, center: [0, 0, -3], radius: 1, mat: 0 }], materials: [{ type: 1, attenuation: [1, 1, 1] }] };
    await renderer.loadScene(mutable);
    mutable.objects[0].center = [2, 0, -3];
    await renderer.loadScene(mutable);
    results.push({ name: 'reloading a changed scene updates GPU geometry', pass: (await renderer.fields.Scene.get([0])).center[0] === 2 });
    await renderer.loadScene(SCENE_LIST[0]);
    renderer.setCamera(camera(SCENE_LIST[0]));
    window.imageMeans = [];
    for (let batch = 0; batch < 3; batch++) {
        await renderer.reset();
        for (let i = 0; i < 8; i++) await renderer.renderSample();
        const values = (await renderer.colors()).flat(2);
        window.imageMeans.push(values.reduce((a, b) => a + b, 0) / values.length / 8);
    }
    return results;
}
window.integrationResults = run();
