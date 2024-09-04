import * as ti from '../lib/taichi.js';
import { MAX_F32 } from '../const.js';

/**
 * @typedef Interval
 * @property {number} min
 * @property {number} max
 */

const Interval = ti.types.struct({
    min: ti.f32,
    max: ti.f32,
});

const get_interval = (min = MAX_F32, max = -MAX_F32) => ({ min, max });
const get_interval_universal = () => ({ min: -MAX_F32, max: MAX_F32 });
/**
 * @param {Interval} a
 * @param {Interval} b
 */
const get_interval_int = (a, b) => {
    const res = {
        min: 0,
        max: 0,
    };

    if (a.min <= b.min) {
        res.min = a.min;
    } else {
        res.min = b.min;
    }

    if (a.max >= b.max) {
        res.max = a.max;
    } else {
        res.max = b.max;
    }

    return res;
};
const interval_size = (int) => int.max - int.min;
const interval_contains = (x, int) => int.min <= x && x <= int.max;
const interval_surrounds = (x, int) => int.min < x && x < int.max;
const interval_clamp = (x, int) => {
    let res = x;
    if (x < int.min) res = int.min;
    if (x > int.max) res = int.max;
    return res;
};
const interval_expand = (int, delta) => {
    const padding = delta / 2;
    return get_interval(int.min - padding, int.max + padding);
};
const get_interval_axis = (int, axis) => {
    let res = int.x;

    if (axis == 1) res = int.y;
    if (axis == 2) res = int.z;
    return res;
};

export {
    Interval,
    get_interval,
    get_interval_universal,
    get_interval_int,
    interval_size,
    interval_contains,
    interval_surrounds,
    interval_clamp,
    interval_expand,
    get_interval_axis,
};
