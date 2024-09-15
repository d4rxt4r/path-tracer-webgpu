import * as ti from '../lib/taichi.js';

import { MAX_F32 } from '../const.js';
import { degrees_to_radians } from './Math.js';

import { Interval, get_interval, get_interval_int, interval_size, interval_expand } from './Interval.js';

const AABB = ti.types.struct({
    x: Interval,
    y: Interval,
    z: Interval,
});

const delta = 0.0001;
const pad_to_minimums_aabb = (aabb) => {
    aabb.x = interval_expand(aabb.x, delta);
    aabb.y = interval_expand(aabb.y, delta);
    aabb.z = interval_expand(aabb.z, delta);
    return aabb;
};

const get_aabb = () => {
    return get_aabb_int(get_interval(), get_interval(), get_interval());
};

const get_aabb_int = (x, y, z) => {
    return pad_to_minimums_aabb({
        x,
        y,
        z,
    });
};

const get_aabb_points = (a, b) => {
    return pad_to_minimums_aabb({
        x: a[0] <= b[0] ? { min: a[0], max: b[0] } : { min: b[0], max: a[0] },
        y: a[1] <= b[1] ? { min: a[1], max: b[1] } : { min: b[1], max: a[1] },
        z: a[2] <= b[2] ? { min: a[2], max: b[2] } : { min: b[2], max: a[2] },
    });
};

const get_aabb_bbox = (box1, box2) => {
    return pad_to_minimums_aabb({
        x: get_interval_int(box1.x, box2.x),
        y: get_interval_int(box1.y, box2.y),
        z: get_interval_int(box1.z, box2.z),
    });
};

const get_aabb_centroid = (aabb) => {
    return [(aabb.x.min + aabb.x.max) / 2, (aabb.y.min + aabb.y.max) / 2, (aabb.z.min + aabb.z.max) / 2];
};

const get_aabb_axis = (aabb, n) => {
    let res = aabb.x;

    if (n === 1) res = aabb.y;
    if (n === 2) res = aabb.z;

    return res;
};

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

    const min = [MAX_F32, MAX_F32, MAX_F32];
    const max = [-MAX_F32, -MAX_F32, -MAX_F32];

    for (let r = 0; r < 3; r++) {
        const radians = degrees_to_radians(rotation[r]);
        const sin_theta = Math.sin(radians);
        const cos_theta = Math.cos(radians);

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    const x = i * aabb.x.max + (1 - i) * aabb.x.min;
                    const y = j * aabb.y.max + (1 - j) * aabb.y.min;
                    const z = k * aabb.z.max + (1 - k) * aabb.z.min;

                    let tester;
                    if (r === 0) {
                        const newy = cos_theta * y - sin_theta * z;
                        const newz = sin_theta * y + cos_theta * z;
                        tester = [x, newy, newz];
                    }
                    if (r === 1) {
                        const newx = cos_theta * x + sin_theta * z;
                        const newz = -sin_theta * x + cos_theta * z;
                        tester = [newx, y, newz];
                    }
                    if (r === 2) {
                        const newx = cos_theta * x - sin_theta * y;
                        const newy = sin_theta * x + cos_theta * y;
                        tester = [newx, newy, z];
                    }

                    for (let c = 0; c < 3; c++) {
                        min[c] = Math.min(min[c], tester[c]);
                        max[c] = Math.max(max[c], tester[c]);
                    }
                }
            }
        }
    }

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
