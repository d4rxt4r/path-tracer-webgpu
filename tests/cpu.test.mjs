import test from 'node:test';
import assert from 'node:assert/strict';
import { build_bvh_from_obj } from '../classes/BVHTree.js';
import { get_sphere_aabb } from '../classes/Sphere.js';
import { get_aabb_points } from '../classes/AABB.js';
import { hex2rgb } from '../classes/Color.js';
import { OBJ_TYPE } from '../const.js';

const sphere = (x) => ({ type: OBJ_TYPE.SPHERE, center: [x, 0, 0], radius: 1 });

test('empty scene produces an empty BVH', () => assert.deepEqual(build_bvh_from_obj([]), []));
test('BVH separates distant clusters and preserves original object indices', () => {
    const tree = build_bvh_from_obj([sphere(100), sphere(-100), sphere(50), sphere(-50)]);
    const left = tree[tree[0].left_index];
    assert.ok(left.bbox.x.max < 0);
    for (const node of tree.filter((n) => n.is_leaf)) {
        assert.equal((node.bbox.x.min + node.bbox.x.max) / 2, [100, -100, 50, -50][node.primitive_index]);
    }
    const visited = new Set();
    let index = 0;
    while (index !== -1) {
        assert.ok(!visited.has(index), 'rope traversal must terminate');
        visited.add(index);
        index = tree[index].is_leaf ? tree[index].right_index : tree[index].left_index;
    }
    assert.equal(visited.size, 7);
});
test('moving sphere bounds include a negative-coordinate endpoint', () => {
    const bbox = get_sphere_aabb({ ...sphere(3), center2: [-4, -5, -6] });
    assert.ok(bbox.x.min <= -5 && bbox.y.min <= -6 && bbox.z.min <= -7);
});
test('AABB padding does not grow nondegenerate geometry', () => {
    const box = get_aabb_points([0, 0, 0], [2, 3, 4]);
    assert.deepEqual(box, { x: { min: 0, max: 2 }, y: { min: 0, max: 3 }, z: { min: 0, max: 4 } });
});
test('background accepts both preset RGB arrays and GUI hex colors', () => {
    assert.deepEqual(hex2rgb([200, 220, 250]), { r: 200, g: 220, b: 250 });
    assert.deepEqual(hex2rgb('#c8dcfa'), { r: 200, g: 220, b: 250 });
});
