import test from 'node:test';
import assert from 'node:assert/strict';
import { RenderLoop } from '../renderer/RenderLoop.js';

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
};
const flush = () => new Promise((done) => setImmediate(done));
const state = (scene) => ({ scene, camera: {}, spp: 1 });

function harness(overrides = {}) {
    const pending = [];
    const loading = [];
    const errors = [];
    const frames = [];
    const renderer = {
        samples: 0,
        loadScene: async () => {},
        setCamera: () => {},
        async reset() {
            this.samples = 0;
        },
        async renderSample() {
            this.samples++;
        },
        ...overrides,
    };
    const loop = new RenderLoop(renderer, {
        schedule: (callback) => {
            pending.push(callback);
            return callback;
        },
        cancel: (callback) => {
            pending.splice(pending.indexOf(callback), 1);
        },
        onLoadingChange: (value) => loading.push(value),
        onError: (error) => errors.push(error.message),
        onFrame: (samples) => frames.push(samples),
    });
    return { loop, loading, errors, frames, pending, tick: () => pending.shift()() };
}

test('loading begins immediately and lasts through upload and first presentation', async () => {
    const upload = deferred();
    const present = deferred();
    const h = harness({
        loadScene: () => upload.promise,
        async renderSample() {
            await present.promise;
            this.samples++;
        },
    });
    h.loop.update(state('a'));
    assert.deepEqual(h.loading, [true]);
    const running = h.tick();
    await flush();
    assert.deepEqual(h.loading, [true]);
    upload.resolve();
    await flush();
    assert.deepEqual(h.loading, [true], 'upload completion does not hide loading');
    present.resolve();
    await running;
    assert.deepEqual(h.loading, [true, false]);
    assert.deepEqual(h.frames, [1]);
});

test('camera updates and continued accumulation do not show loading for an already presented scene', async () => {
    const h = harness();
    h.loop.update(state('a'));
    await h.tick();
    assert.deepEqual(h.loading, [true, false]);
    h.loop.update({ ...state('a'), spp: 2 });
    await h.tick();
    await h.tick();
    assert.deepEqual(h.loading, [true, false]);
    h.loop.update(state('b'));
    assert.deepEqual(h.loading, [true, false, true]);
    await h.tick();
    assert.deepEqual(h.loading, [true, false, true, false]);
});

for (const phase of ['loadScene', 'renderSample']) {
    for (const fails of [false, true]) {
        test(`stale ${phase} ${fails ? 'failure' : 'completion'} keeps the latest scene loading`, async () => {
            const old = deferred();
            let first = true;
            const h = harness({
                async [phase]() {
                    if (first) {
                        first = false;
                        await old.promise;
                    }
                    if (phase === 'renderSample') this.samples++;
                },
            });
            h.loop.update(state('old'));
            const running = h.tick();
            await flush();
            h.loop.update(state('skipped'));
            h.loop.update(state('latest'));
            if (fails) old.reject(new Error('obsolete request'));
            else old.resolve();
            await running;
            assert.deepEqual(h.loading, [true]);
            assert.deepEqual(h.frames, []);
            assert.deepEqual(h.errors, []);
            await h.tick();
            assert.deepEqual(h.loading, [true, false]);
            assert.deepEqual(h.frames, [1]);
        });
    }
}

test('stopping a pending presentation clears loading and retrying the scene shows it again', async () => {
    const present = deferred();
    const h = harness({
        async renderSample() {
            await present.promise;
            this.samples++;
        },
    });
    h.loop.update(state('a'));
    const running = h.tick();
    await flush();
    h.loop.stop();
    assert.deepEqual(h.loading, [true, false]);
    present.resolve();
    await running;
    assert.deepEqual(h.frames, []);
    h.loop.update(state('a'));
    assert.deepEqual(h.loading, [true, false, true]);
    await h.tick();
    assert.deepEqual(h.loading, [true, false, true, false]);
});

test('current errors clear loading and allow recovery on the same scene', async () => {
    let fail = true;
    const h = harness({
        async renderSample() {
            if (fail) throw new Error('render failed');
            this.samples++;
        },
    });
    h.loop.update(state('a'));
    await h.tick();
    assert.deepEqual(h.errors, ['render failed']);
    assert.deepEqual(h.loading, [true, false]);
    fail = false;
    h.loop.update(state('a'));
    await h.tick();
    assert.deepEqual(h.loading, [true, false, true, false]);
    assert.deepEqual(h.frames, [1]);
});

test('returning to the last presented scene cancels loading before an unused queued switch', async () => {
    const h = harness();
    h.loop.update(state('a'));
    await h.tick();
    h.loop.update(state('b'));
    h.loop.update(state('a'));
    assert.deepEqual(h.loading, [true, false, true, false]);
    await h.tick();
    assert.deepEqual(h.loading, [true, false, true, false]);
});
