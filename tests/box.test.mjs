import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare_scene, scene_capacities } from '../renderer/SceneData.js';
import { OBJ_TYPE, MAT_TYPE } from '../const.js';
import { build_bvh_from_obj } from '../classes/BVHTree.js';

const box = { type: OBJ_TYPE.BOX, min: [-1, -2, -3], max: [1, 2, 3], mat: 0, offset: [3, -3, 0], rotation: [0, 90, 0] };
const materials = [{ type: MAT_TYPE.ISOTROPIC, attenuation: [1, 1, 1], k: 0.01 }];
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test('BVH diagnostics accept raw BOX and nested medium scene records', () => {
    for (const object of [box, { type: OBJ_TYPE.MEDIUM, mat: 0, boundary: box }]) {
        const raw = build_bvh_from_obj([object]);
        const prepared = prepare_scene({ objects: [object], materials });
        assert.deepEqual(raw[0].bbox, prepared.bvh[0].bbox);
    }
});

test('a rotated BOX is one BVH leaf with exact world bounds and separate geometry', () => {
    const prepared = prepare_scene({ objects: [box], materials });
    assert.equal(prepared.objects.length, 1);
    assert.equal(prepared.bvh.length, 1);
    assert.equal(prepared.boxes.length, 1);
    assert.equal(prepared.objects[0].box_index, 0);
    assert.deepEqual(prepared.boxes[0].half_size, [1, 2, 3]);
    const bounds = prepared.bvh[0].bbox;
    for (const [axis, min, max] of [
        ['x', 0, 6],
        ['y', -5, -1],
        ['z', -1, 1],
    ]) {
        close(bounds[axis].min, min);
        close(bounds[axis].max, max);
    }
});

test('nested box medium uses the outer material and does not add a visible boundary', () => {
    const prepared = prepare_scene({ objects: [{ type: OBJ_TYPE.MEDIUM, mat: 0, boundary: { ...box, mat: 999 } }], materials });
    assert.equal(prepared.objects.length, 1);
    assert.equal(prepared.objects[0].type, OBJ_TYPE.MEDIUM);
    assert.equal(prepared.objects[0].boundary_type, OBJ_TYPE.BOX);
    assert.equal(prepared.objects[0].mat, 0);
    assert.equal(prepared.counts[0], 1);
});

test('legacy and explicit moving sphere boundaries prepare identically', () => {
    const sphere = { type: OBJ_TYPE.SPHERE, center: [1, 2, 3], center2: [-1, -2, -3], radius: 2, offset: [1, 0, 0] };
    const legacy = prepare_scene({ objects: [{ ...sphere, type: OBJ_TYPE.MEDIUM, mat: 0 }], materials });
    const nested = prepare_scene({ objects: [{ type: OBJ_TYPE.MEDIUM, mat: 0, boundary: sphere }], materials });
    for (const key of ['center', 'center2', 'radius', 'boundary_type', 'mat'])
        assert.deepEqual(nested.objects[0][key], legacy.objects[0][key]);
});

test('BOX lights expand into six prepared quad targets and capacities include them', () => {
    const scene = { objects: [box, { type: OBJ_TYPE.MEDIUM, boundary: box, mat: 0 }], lights: [box], materials };
    const prepared = prepare_scene(scene);
    assert.equal(prepared.boxes.length, 2);
    assert.equal(prepared.lights.length, 6);
    assert.ok(prepared.lights.every((face) => face.type === OBJ_TYPE.QUAD && face.area > 0));
    assert.equal(
        prepared.lights.reduce((sum, face) => sum + face.area, 0),
        88,
    );
    assert.deepEqual(scene_capacities([scene]), { objects: 2, lights: 6, boxes: 2, materials: 1, textures: 1, nodes: 3 });
});

test('box size and medium boundary errors identify invalid geometry', () => {
    const prepare = (object) => prepare_scene({ objects: [object], materials });
    assert.throws(() => prepare({ ...box, max: [-1, 2, 3] }), /box.*size/i);
    assert.throws(() => prepare({ ...box, min: [NaN, 0, 0] }), /box.*finite/i);
    assert.throws(() => prepare({ type: OBJ_TYPE.MEDIUM, boundary: { type: OBJ_TYPE.QUAD }, mat: 0 }), /medium.*boundary/i);
    assert.throws(() => prepare({ type: OBJ_TYPE.MEDIUM, boundary: box, offset: [1, 0, 0], mat: 0 }), /boundary/i);
    assert.throws(
        () => prepare_scene({ objects: [{ type: OBJ_TYPE.MEDIUM, boundary: box, mat: 0 }], materials: [{ ...materials[0], k: 0 }] }),
        /density/i,
    );
    const reversed = prepare_scene({ objects: [{ ...box, min: box.max, max: box.min }], materials });
    assert.deepEqual(reversed.boxes[0].half_size, [1, 2, 3]);
});
