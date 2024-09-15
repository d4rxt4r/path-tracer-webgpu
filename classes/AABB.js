import * as ti from '../lib/taichi.js';

import { degrees_to_radians } from './Math.js';

import { Interval, get_interval, get_interval_int, interval_size, interval_expand } from './Interval.js';

/**
 * @typedef TAABB
 * @property {import('./Interval.js').Interval} x
 * @property {import('./Interval.js').Interval} y
 * @property {import('./Interval.js').Interval} z
 */

const AABB = ti.types.struct({
    x: Interval,
    y: Interval,
    z: Interval,
});

const delta = 0.0001;
/**
 * @param {TAABB} aabb
 * @returns {TAABB}
 */
const pad_to_minimums_aabb = (aabb) => {
    aabb.x = interval_expand(aabb.x, delta);
    aabb.y = interval_expand(aabb.y, delta);
    aabb.z = interval_expand(aabb.z, delta);
    return aabb;
};

/**
 * @returns {TAABB}
 */
const get_aabb = () => {
    return get_aabb_int(get_interval(), get_interval(), get_interval());
};

/**
 * @param {import('./Interval.js').Interval} x
 * @param {import('./Interval.js').Interval} y
 * @param {import('./Interval.js').Interval} z
 * @returns {TAABB}
 */
const get_aabb_int = (x, y, z) => {
    return pad_to_minimums_aabb({
        x,
        y,
        z,
    });
};

/**
 * @param {import('./Vector.js').vec3} a
 * @param {import('./Vector.js').vec3} b
 * @returns {TAABB}
 */
const get_aabb_points = (a, b) => {
    return pad_to_minimums_aabb({
        x: { min: Math.min(a[0], b[0]), max: Math.max(a[0], b[0]) },
        y: { min: Math.min(a[1], b[1]), max: Math.max(a[1], b[1]) },
        z: { min: Math.min(a[2], b[2]), max: Math.max(a[2], b[2]) },
    });
};

/**
 * @param {TAABB} box1
 * @param {TAABB} box2
 * @returns {TAABB}
 */
const get_aabb_bbox = (box1, box2) => {
    return pad_to_minimums_aabb({
        x: get_interval_int(box1.x, box2.x),
        y: get_interval_int(box1.y, box2.y),
        z: get_interval_int(box1.z, box2.z),
    });
};

/**
 * @param {TAABB} aabb
 * @returns {import('./Vector.js').vec3}
 */
const get_aabb_centroid = (aabb) => {
    return [(aabb.x.min + aabb.x.max) / 2, (aabb.y.min + aabb.y.max) / 2, (aabb.z.min + aabb.z.max) / 2];
};

/**
 * @param {TAABB} aabb
 * @returns {import('./Interval.js').Interval}
 */
const get_aabb_axis = (aabb, n) => {
    let res = aabb.x;

    if (n === 1) res = aabb.y;
    if (n === 2) res = aabb.z;

    return res;
};

/**
 * @param {TAABB} aabb
 * @returns {number}
 */
const get_longest_aabb_axis = (aabb) => {
    let res = 0;

    if (interval_size(aabb.x) >= interval_size(aabb.y) && interval_size(aabb.x) >= interval_size(aabb.z)) {
        res = 0;
    } else if (interval_size(aabb.y) >= interval_size(aabb.z)) {
        res = 1;
    } else {
        res = 2;
    }

    return res;
};

const hit_aabb = (r, ray_t, aabb) => {
    let res = true;

    const ray_orig = r.origin;
    const ray_dir = r.direction;

    for (let axis of ti.Static(ti.range(3))) {
        const ax = get_aabb_axis(aabb, axis);

        const adinv = 1.0 / ray_dir[axis];

        const t0 = (ax.min - ray_orig[axis]) * adinv;
        const t1 = (ax.max - ray_orig[axis]) * adinv;

        let min = ray_t.min;
        let max = ray_t.max;

        if (t0 < t1) {
            if (t0 > ray_t.min) min = t0;
            if (t1 < ray_t.max) max = t1;
        } else {
            if (t1 > ray_t.min) min = t1;
            if (t0 < ray_t.max) max = t0;
        }

        if (max <= min) {
            res = false;
        }

        if (res) {
            ray_t.min = min;
            ray_t.max = max;
        }
    }

    return res;
};

const translate_aabb = (aabb, offset) => {
    if (!offset) {
        return aabb;
    }

    return get_aabb_int(
        get_interval(aabb.x.min + offset[0], aabb.x.max + offset[0]),
        get_interval(aabb.y.min + offset[1], aabb.y.max + offset[1]),
        get_interval(aabb.z.min + offset[2], aabb.z.max + offset[2]),
    );
};

/**
 * @param {AABB } aabb
 * @param {import('./Vector.js').vec3} rotation
 */
const rotate_aabb = (aabb, rotation) => {
    if (!rotation) {
        return aabb;
    }

    const corners = [
        [aabb.x.min, aabb.y.min, aabb.z.min],
        [aabb.x.min, aabb.y.min, aabb.z.max],
        [aabb.x.min, aabb.y.max, aabb.z.min],
        [aabb.x.min, aabb.y.max, aabb.z.max],
        [aabb.x.max, aabb.y.min, aabb.z.min],
        [aabb.x.max, aabb.y.min, aabb.z.max],
        [aabb.x.max, aabb.y.max, aabb.z.min],
        [aabb.x.max, aabb.y.max, aabb.z.max],
    ];

    const rotated_corners = corners.map((corner) => {
        let [x, y, z] = corner;

        for (let r = 0; r < 3; r++) {
            const radians = degrees_to_radians(rotation[r]);
            const sin_theta = Math.sin(radians);
            const cos_theta = Math.cos(radians);

            if (r === 0) {
                const newy = cos_theta * y - sin_theta * z;
                const newz = sin_theta * y + cos_theta * z;
                y = newy;
                z = newz;
            } else if (r === 1) {
                const newx = cos_theta * x + sin_theta * z;
                const newz = -sin_theta * x + cos_theta * z;
                x = newx;
                z = newz;
            } else if (r === 2) {
                const newx = cos_theta * x - sin_theta * y;
                const newy = sin_theta * x + cos_theta * y;
                x = newx;
                y = newy;
            }
        }

        return [x, y, z];
    });

    const min = [
        Math.min(...rotated_corners.map((c) => c[0])),
        Math.min(...rotated_corners.map((c) => c[1])),
        Math.min(...rotated_corners.map((c) => c[2])),
    ];

    const max = [
        Math.max(...rotated_corners.map((c) => c[0])),
        Math.max(...rotated_corners.map((c) => c[1])),
        Math.max(...rotated_corners.map((c) => c[2])),
    ];

    return get_aabb_points(min, max);
};

export {
    AABB,
    pad_to_minimums_aabb,
    get_aabb,
    get_aabb_int,
    get_aabb_points,
    get_aabb_bbox,
    get_aabb_centroid,
    get_aabb_axis,
    hit_aabb,
    get_longest_aabb_axis,
    translate_aabb,
    rotate_aabb,
};
