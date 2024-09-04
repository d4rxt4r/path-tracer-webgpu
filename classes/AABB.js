import * as ti from '../lib/taichi.js';
import VectorFactory from './Vector.js';
const vf = new VectorFactory();

import { Interval, get_interval, get_interval_int, interval_size } from './Interval.js';

const AABB = ti.types.struct({
    x: Interval,
    y: Interval,
    z: Interval,
});

class K_AABB {
    constructor(min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]) {
        this.min = min;
        this.max = max;
    }

    static surroundingBox(box1, box2) {
        if (!box1 && !box2) {
            console.warn('AABB.surroundingBox received two invalid boxes');
            return new K_AABB();
        }
        if (!box1) return new K_AABB(box2.min, box2.max);
        if (!box2) return new K_AABB(box1.min, box1.max);

        const small = vf.min(box1.min, box2.min);
        const big = vf.max(box1.max, box2.max);
        return new K_AABB(small, big);
    }

    centroid() {
        return [(this.min[0] + this.max[0]) / 2, (this.min[1] + this.max[1]) / 2, (this.min[2] + this.max[2]) / 2];
    }

    longestAxis() {
        const d = [this.max[0] - this.min[0], this.max[1] - this.min[1], this.max[2] - this.min[2]];
        if (d.x > d.y && d.x > d.z) return 0;
        if (d.y > d.z) return 1;
        return 2;
    }
}

const get_aabb_int = (x, y, z) => {
    return {
        x: get_interval(x.min, x.max),
        y: get_interval(y.min, y.max),
        z: get_interval(z.min, z.max),
    };
};

const get_aabb_points = (a, b) => {
    return {
        x: a[0] <= b[0] ? { min: a[0], max: b[0] } : { min: b[0], max: a[0] },
        y: a[1] <= b[1] ? { min: a[1], max: b[1] } : { min: b[1], max: a[1] },
        z: a[2] <= b[2] ? { min: a[2], max: b[2] } : { min: b[2], max: a[2] },
    };
};

const get_aabb_bbox = (box1, box2) => {
    return {
        x: get_interval_int(box1.x, box2.x),
        y: get_interval_int(box1.y, box2.y),
        z: get_interval_int(box1.z, box2.z),
    };
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

export { AABB, K_AABB, get_aabb_int, get_aabb_points, get_aabb_bbox, get_aabb_axis, hit_aabb, get_longest_aabb_axis };
