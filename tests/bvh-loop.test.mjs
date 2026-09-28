import test from 'node:test';
import assert from 'node:assert/strict';
import { RenderLoop } from '../renderer/RenderLoop.js';

const bvh = (mode, depth = 2) => ({ mode, selection: 'level', depth });
function harness() {
    const queued = [];
    const views = [];
    const loading = [];
    const renderer = {
        samples: 0,
        traces: 0,
        resets: 0,
        loads: 0,
        async loadScene() {
            this.loads++;
        },
        setCamera() {},
        async reset() {
            this.samples = 0;
            this.resets++;
        },
        async renderSample() {
            this.samples++;
            this.traces++;
        },
    };
    const loop = new RenderLoop(renderer, {
        schedule: (fn) => {
            queued.push(fn);
            return fn;
        },
        cancel: (fn) => queued.splice(queued.indexOf(fn), 1),
        onView: (state) => views.push(state),
        onLoadingChange: (value) => loading.push(value),
        onError: (error) => {
            throw error;
        },
    });
    return { renderer, loop, views, loading, queued, tick: () => queued.shift()() };
}

test('BVH-only presents the view without tracing or clearing accumulation', async () => {
    const h = harness();
    const state = { scene: {}, camera: {}, spp: 200, bvh: bvh('only') };
    h.loop.update(state);
    await h.tick();
    assert.deepEqual(h.views, [state]);
    assert.equal(h.renderer.traces, 0);
    assert.equal(h.renderer.resets, 0);
    assert.equal(h.queued.length, 0);
    assert.deepEqual(h.loading, [true, false]);
});

test('view and depth changes preserve accumulated samples and completed renders stay stopped', async () => {
    const h = harness();
    const state = { scene: {}, camera: {}, spp: 2 };
    h.loop.update(state);
    await h.tick();
    await h.tick();
    for (const view of [bvh('overlay'), bvh('overlay', 0), bvh('only'), bvh('off')]) {
        h.loop.update({ ...state, bvh: view });
        await h.tick();
        assert.equal(h.renderer.samples, 2);
        assert.equal(h.renderer.traces, 2);
        assert.equal(h.renderer.resets, 1);
        assert.equal(h.queued.length, 0);
    }
});

test('BVH-only camera and scene edits reset accumulation only when tracing resumes', async () => {
    const h = harness();
    let state = { scene: {}, camera: {}, spp: 1 };
    h.loop.update(state);
    await h.tick();
    state = { ...state, camera: {}, bvh: bvh('only') };
    h.loop.update(state);
    await h.tick();
    assert.equal(h.renderer.resets, 1);
    h.loop.update({ ...state, bvh: bvh('overlay') });
    await h.tick();
    assert.equal(h.renderer.resets, 2);
    state = { ...state, scene: {}, bvh: bvh('only') };
    h.loop.update(state);
    await h.tick();
    assert.equal(h.renderer.resets, 2);
    h.loop.update({ ...state, bvh: bvh('off') });
    await h.tick();
    assert.equal(h.renderer.resets, 3);
    assert.equal(h.renderer.traces, 3);
});

test('progressive samples do not repeatedly redraw an unchanged debug view', async () => {
    const h = harness();
    const state = { scene: {}, camera: {}, spp: 3, bvh: bvh('overlay') };
    h.loop.update(state);
    await h.tick();
    await h.tick();
    await h.tick();
    assert.deepEqual(h.views, [state]);
    assert.equal(h.renderer.traces, 3);
});

test('a scene switch during an old render never draws the old debug view', async () => {
    const h = harness();
    let release;
    let first = true;
    h.renderer.renderSample = async () => {
        if (first) {
            first = false;
            await new Promise((resolve) => {
                release = resolve;
            });
        }
        h.renderer.samples++;
    };
    h.loop.update({ scene: 'old', camera: {}, spp: 1, bvh: bvh('overlay') });
    const running = h.tick();
    await new Promise((resolve) => setImmediate(resolve));
    const latest = { scene: 'new', camera: {}, spp: 1, bvh: bvh('only') };
    h.loop.update(latest);
    release();
    await running;
    assert.deepEqual(h.views, []);
    await h.tick();
    assert.deepEqual(h.views, [latest]);
    assert.deepEqual(h.loading, [true, false]);
});
