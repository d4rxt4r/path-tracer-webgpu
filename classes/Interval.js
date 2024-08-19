import * as ti from '../lib/taichi.js';

/**
 * @typedef Interval
 * @property {number} min
 * @property {number} max
 */

const get_interval = (min, max) => ({ min: ti.f32(min), max: ti.f32(max) });
const interval_size = (int) => int.max - int.min;
const interval_contains = (x, int) => int.min <= x && x <= int.max;
const interval_surrounds = (x, int) => int.min < x && x < int.max;
const interval_clamp = (x, int) => {
    let res = x;
    if (x < int.min) res = int.min;
    if (x > int.max) res = int.max;
    return res;
};

export { get_interval, interval_size, interval_contains, interval_surrounds, interval_clamp };
