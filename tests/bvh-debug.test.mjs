import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare_bvh_debug, select_bvh_nodes, make_bvh_projection, project_bvh_edge } from '../renderer/BvhDebug.js';

const bounds = { x: { min: -1, max: 1 }, y: { min: -2, max: 2 }, z: { min: -5, max: -3 } };
const node = (parent_index, is_leaf) => ({ parent_index, is_leaf, bbox: bounds, right_index: -1 });
const tree = [node(-1, false), node(0, true), node(0, false), node(2, true), node(2, true)];

test('debug depths follow parents rather than traversal ropes, and leaves retain shallow nodes', () => {
    const data = prepare_bvh_debug(tree);
    assert.deepEqual(
        data.nodes.map((n) => n.depth),
        [0, 1, 1, 2, 2],
    );
    assert.equal(data.maxDepth, 2);
    assert.deepEqual(
        select_bvh_nodes(data, 'level', 1).map((n) => n.index),
        [1, 2],
    );
    assert.deepEqual(
        select_bvh_nodes(data, 'leaves', 0).map((n) => n.index),
        [1, 3, 4],
    );
    assert.deepEqual(
        select_bvh_nodes(data, 'level', 99).map((n) => n.index),
        [3, 4],
    );
    assert.deepEqual(
        select_bvh_nodes(data, 'level', -1).map((n) => n.index),
        [0],
    );
});

test('debug snapshot is immutable and independent of prepared geometry', () => {
    const data = prepare_bvh_debug(tree);
    assert.throws(() => {
        data.nodes[0].bounds[0] = 99;
    }, TypeError);
    assert.throws(() => {
        data.leaves.pop();
    }, TypeError);
    assert.equal(bounds.x.min, -1);
});

test('empty trees and single primitive trees have usable depth ranges', () => {
    const empty = prepare_bvh_debug([]);
    assert.equal(empty.maxDepth, 0);
    assert.deepEqual(select_bvh_nodes(empty, 'level', 2), []);
    const single = prepare_bvh_debug([node(-1, true)]);
    assert.deepEqual(
        select_bvh_nodes(single, 'level', 2).map((n) => n.index),
        [0],
    );
    assert.equal(select_bvh_nodes(single, 'leaves', 0).length, 1);
});

// Hand-constructed pinhole camera: 101x101 field, focus plane z=-1, 0.02 units per texel.
const camera = {
    camera_center_x: 0,
    camera_center_y: 0,
    camera_center_z: 0,
    pixel00_loc_x: -1,
    pixel00_loc_y: -1,
    pixel00_loc_z: -1,
    pixel_delta_u_x: 0.02,
    pixel_delta_u_y: 0,
    pixel_delta_u_z: 0,
    pixel_delta_v_x: 0,
    pixel_delta_v_y: 0.02,
    pixel_delta_v_z: 0,
};
const projection = () => make_bvh_projection(camera, 101, 101);
const close = (actual, expected) => actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-8, `${v} vs ${expected[i]}`));

test('projection matches field presentation scale and flipped vertical axis', () => {
    const edge = project_bvh_edge(projection(), [0, 0, -1], [0.5, 0.5, -1]);
    close(edge, [51.005, 49.995, 76.255, 24.745]);
});

test('projection uses camera position and basis instead of assuming world axes', () => {
    const turned = make_bvh_projection(
        {
            ...camera,
            camera_center_x: 3,
            camera_center_y: 4,
            camera_center_z: 5,
            pixel00_loc_x: 4,
            pixel00_loc_y: 3,
            pixel00_loc_z: 4,
            pixel_delta_u_x: 0,
            pixel_delta_u_z: 0.02,
        },
        101,
        101,
    );
    close(project_bvh_edge(turned, [4, 4, 5], [4, 4.5, 5.5]), [51.005, 49.995, 76.255, 24.745]);
});

test('edges behind the camera disappear and crossing edges clip without infinities', () => {
    assert.equal(project_bvh_edge(projection(), [-1, 0, 1], [1, 0, 1]), null);
    const crossing = project_bvh_edge(projection(), [0, 0, 1], [0, 0, -1]);
    assert.ok(crossing.every(Number.isFinite));
    close(crossing, [51.005, 49.995, 51.005, 49.995]);
});

test('projected segments clip to the canvas and reject offscreen edges', () => {
    close(project_bvh_edge(projection(), [-1000, 0, -1], [1000, 0, -1]), [0, 49.995, 101, 49.995]);
    assert.equal(project_bvh_edge(projection(), [3, -1, -1], [3, 1, -1]), null);
});
