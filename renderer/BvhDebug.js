import vf from '../classes/Vector.js';

const EMPTY = Object.freeze([]);
const EDGES = [
    [0, 1],
    [0, 2],
    [0, 4],
    [1, 3],
    [1, 5],
    [2, 3],
    [2, 6],
    [3, 7],
    [4, 5],
    [4, 6],
    [5, 7],
    [6, 7],
];
const NEAR = 1e-4;

export function prepare_bvh_debug(tree) {
    const levels = [];
    const leaves = [];
    const nodes = [];
    for (const [index, source] of tree.entries()) {
        const depth = source.parent_index < 0 ? 0 : nodes[source.parent_index].depth + 1;
        const { x, y, z } = source.bbox;
        const node = Object.freeze({
            index,
            depth,
            isLeaf: !!source.is_leaf,
            bounds: Object.freeze([x.min, x.max, y.min, y.max, z.min, z.max]),
        });
        nodes.push(node);
        (levels[depth] ??= []).push(node);
        if (node.isLeaf) leaves.push(node);
    }
    return Object.freeze({
        nodes: Object.freeze(nodes),
        levels: Object.freeze(levels.map(Object.freeze)),
        leaves: Object.freeze(leaves),
        maxDepth: Math.max(0, levels.length - 1),
    });
}

export function select_bvh_nodes(data, selection, depth) {
    if (selection === 'leaves') return data.leaves;
    return data.levels[Math.max(0, Math.min(data.maxDepth, Math.floor(depth)))] ?? EMPTY;
}

export function make_bvh_projection(camera, width, height) {
    const vector = (name) => [camera[`${name}_x`], camera[`${name}_y`], camera[`${name}_z`]];
    const center = vector('camera_center');
    const du = vector('pixel_delta_u');
    const dv = vector('pixel_delta_v');
    const u = vf.normalized(du);
    const v = vf.normalized(dv);
    const forward = vf.normalized(vf.cross(v, u));
    const origin = vf.sub(vector('pixel00_loc'), center);
    return {
        center,
        u,
        v,
        forward,
        plane: vf.dot(origin, forward),
        originU: vf.dot(origin, u),
        originV: vf.dot(origin, v),
        dx: vf.length(du),
        dy: vf.length(dv),
        width,
        height,
        sx: width / Math.max(1, width - 1),
        sy: height / Math.max(1, height - 1),
    };
}

function camera_point(projection, point) {
    const q = vf.sub(point, projection.center);
    return [vf.dot(q, projection.u), vf.dot(q, projection.v), vf.dot(q, projection.forward)];
}

function project_camera_edge(p, a, b) {
    if (a[2] < NEAR && b[2] < NEAR) return null;
    if (a[2] < NEAR || b[2] < NEAR) {
        const t = (NEAR - a[2]) / (b[2] - a[2]);
        const clipped = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), NEAR];
        if (a[2] < NEAR) a = clipped;
        else b = clipped;
    }
    // Taichi presents field texels with floor(uv * (size - 1)); map their centers to Canvas coordinates.
    const project = (q) => [
        (((q[0] * p.plane) / q[2] - p.originU) / p.dx + 0.5) * p.sx,
        p.height - (((q[1] * p.plane) / q[2] - p.originV) / p.dy + 0.5) * p.sy,
    ];
    const start = project(a);
    const end = project(b);
    if (![...start, ...end].every(Number.isFinite)) return null;
    let enter = 0;
    let exit = 1;
    for (let axis = 0; axis < 2; axis++) {
        const limit = axis === 0 ? p.width : p.height;
        const delta = end[axis] - start[axis];
        if (delta === 0) {
            if (start[axis] < 0 || start[axis] > limit) return null;
        } else {
            const a = -start[axis] / delta;
            const b = (limit - start[axis]) / delta;
            enter = Math.max(enter, Math.min(a, b));
            exit = Math.min(exit, Math.max(a, b));
            if (enter > exit) return null;
        }
    }
    return [
        start[0] + enter * (end[0] - start[0]),
        start[1] + enter * (end[1] - start[1]),
        start[0] + exit * (end[0] - start[0]),
        start[1] + exit * (end[1] - start[1]),
    ];
}

export function project_bvh_edge(projection, a, b) {
    return project_camera_edge(projection, camera_point(projection, a), camera_point(projection, b));
}

export function bvh_box_segments(projection, bounds) {
    const corners = Array.from({ length: 8 }, (_, i) =>
        camera_point(projection, [bounds[i & 1], bounds[2 + ((i >> 1) & 1)], bounds[4 + ((i >> 2) & 1)]]),
    );
    return EDGES.map(([a, b]) => project_camera_edge(projection, corners[a], corners[b])).filter(Boolean);
}
