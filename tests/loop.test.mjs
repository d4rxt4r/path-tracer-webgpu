import test from 'node:test';
import assert from 'node:assert/strict';
import { RenderLoop } from '../renderer/RenderLoop.js';

test('default animation scheduling calls browser methods with the global receiver', () => {
    const request = globalThis.requestAnimationFrame;
    const cancel = globalThis.cancelAnimationFrame;
    const canceled = [];
    let next = 0;
    globalThis.requestAnimationFrame = function () {
        assert.equal(this, globalThis, 'requestAnimationFrame receiver');
        return ++next;
    };
    globalThis.cancelAnimationFrame = function (id) {
        assert.equal(this, globalThis, 'cancelAnimationFrame receiver');
        canceled.push(id);
    };
    try {
        const loop = new RenderLoop({});
        loop.update({ scene: {}, camera: {}, spp: 1 });
        loop.update({ scene: {}, camera: {}, spp: 1 });
        loop.stop();
        assert.deepEqual(canceled, [1, 2]);
    } finally {
        if (request) globalThis.requestAnimationFrame = request;
        else delete globalThis.requestAnimationFrame;
        if (cancel) globalThis.cancelAnimationFrame = cancel;
        else delete globalThis.cancelAnimationFrame;
    }
});

test('new scene waits for an in-flight sample and discards its completion notification', async () => {
    let release;
    const waiting = new Promise((done) => {
        release = done;
    });
    const frames = [];
    const pending = [];
    let scene;
    let samples = 0;
    const renderer = {
        get samples() {
            return samples;
        },
        loadScene: async (value) => {
            scene = value;
        },
        setCamera: () => {},
        reset: async () => {
            samples = 0;
        },
        renderSample: async () => {
            if (scene === 'old') await waiting;
            samples++;
        },
    };
    const loop = new RenderLoop(renderer, {
        schedule: (fn) => {
            pending.push(fn);
            return fn;
        },
        cancel: (fn) => {
            const i = pending.indexOf(fn);
            if (i >= 0) pending.splice(i, 1);
        },
        onFrame: (n) => frames.push(n),
    });
    loop.update({ scene: 'old', camera: {}, spp: 2 });
    const old = pending.shift()();
    await new Promise((done) => setImmediate(done));
    loop.update({ scene: 'new', camera: {}, spp: 1 });
    release();
    await old;
    assert.deepEqual(frames, []);
    await pending.shift()();
    assert.equal(scene, 'new');
    assert.equal(samples, 1);
    assert.deepEqual(frames, [1]);
    assert.equal(pending.length, 0, 'stop scheduling at the sample target');
    loop.stop();
});
test('render failure stops the loop and is reported once', async () => {
    const pending = [];
    const errors = [];
    const loop = new RenderLoop(
        {
            samples: 0,
            loadScene: async () => {},
            setCamera: () => {},
            reset: async () => {},
            renderSample: async () => {
                throw new Error('device lost');
            },
        },
        {
            schedule: (fn) => {
                pending.push(fn);
                return fn;
            },
            cancel: () => {},
            onError: (error) => errors.push(error.message),
        },
    );
    loop.update({ scene: {}, camera: {}, spp: 10 });
    await pending.shift()();
    assert.deepEqual(errors, ['device lost']);
    assert.equal(pending.length, 0);
});

test('a stale frame failure does not cancel a newer scene request', async () => {
    let rejectOld;
    const waiting = new Promise((_, reject) => {
        rejectOld = reject;
    });
    const pending = [];
    const errors = [];
    const frames = [];
    let scene;
    const renderer = {
        samples: 0,
        loadScene: async (value) => {
            scene = value;
        },
        setCamera: () => {},
        reset: async () => {
            renderer.samples = 0;
        },
        renderSample: async () => {
            if (scene === 'old') await waiting;
            renderer.samples++;
        },
    };
    const loop = new RenderLoop(renderer, {
        schedule: (fn) => {
            pending.push(fn);
            return fn;
        },
        cancel: () => {},
        onError: (error) => errors.push(error.message),
        onFrame: (samples) => frames.push(samples),
    });
    loop.update({ scene: 'old', camera: {}, spp: 1 });
    const old = pending.shift()();
    await new Promise((done) => setImmediate(done));
    loop.update({ scene: 'new', camera: {}, spp: 1 });
    rejectOld(new Error('stale frame failed'));
    await old;
    assert.deepEqual(errors, []);
    assert.equal(pending.length, 1, 'latest request remains queued');
    await pending.shift()();
    assert.equal(scene, 'new');
    assert.deepEqual(frames, [1]);
    assert.equal(pending.length, 0);
});
