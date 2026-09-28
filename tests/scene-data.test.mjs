import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare_scene, scene_capacities } from '../renderer/SceneData.js';

const scene = { objects: [{ type: 1, center: [1, 2, 3], radius: 1, mat: 0 }], materials: [{ type: 1, attenuation: [1, 1, 1] }] };
test('static sphere defaults to the same endpoint, not the world origin', () => {
    const prepared = prepare_scene(scene);
    assert.deepEqual(prepared.objects[0].center2, [1, 2, 3]);
    assert.equal(prepared.textures.length, 1, 'reserve texture slot zero');
});
test('capacities include 2N-1 BVH nodes and the fallback texture', () => {
    assert.deepEqual(
        scene_capacities([{ ...scene, objects: Array(600).fill(scene.objects[0]), textures: [{ type: 1, color: [1, 1, 1] }] }]),
        { objects: 600, lights: 1, boxes: 1, materials: 1, textures: 2, nodes: 1199 },
    );
});
test('invalid references and unsupported geometry fail before GPU upload', () => {
    assert.throws(() => prepare_scene({ ...scene, objects: [{ ...scene.objects[0], mat: 2 }] }), /material/i);
    assert.throws(() => prepare_scene({ ...scene, objects: [{ ...scene.objects[0], radius: 0 }] }), /radius/i);
    assert.throws(() => prepare_scene({ ...scene, objects: [{ type: 999, mat: 0 }] }), /unsupported/i);
    assert.throws(() => prepare_scene({ ...scene, objects: [{ ...scene.objects[0], center: [NaN, 0, 0] }] }), /finite/i);
    assert.throws(() => prepare_scene({ ...scene, lights: [{ type: 3, center: [0, 0, 0], radius: 1 }] }), /light/i);
});
test('empty scenes still have valid upload defaults', () => {
    const prepared = prepare_scene({ objects: [] });
    assert.deepEqual(prepared.counts, [0, 0, 0, 0]);
    assert.deepEqual(prepared.bvh, []);
});

test('preparation transforms geometry and lights into the same world coordinates', () => {
    const quad = { type: 2, Q: [-1, -1, -3], u: [2, 0, 0], v: [0, 2, 0], rotation: [0, 90, 0], offset: [1, -1, 0], mat: 0 };
    const prepared = prepare_scene({ objects: [quad], lights: [quad], materials: scene.materials });
    for (const object of [prepared.objects[0], prepared.lights[0]]) {
        assert.ok(Math.abs(object.Q[0] + 2) < 1e-6);
        assert.ok(Math.abs(object.Q[1] + 2) < 1e-6);
        assert.ok(Math.abs(object.Q[2] - 1) < 1e-6);
        assert.ok(Math.abs(object.normal[0] - 1) < 1e-6);
        assert.ok(Math.abs(object.plane_d + 2) < 1e-6);
        assert.equal(object.area, 4);
    }
});
