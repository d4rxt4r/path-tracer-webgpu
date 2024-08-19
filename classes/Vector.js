import * as ti from '../lib/taichi.js';
import { EPS } from '../const.js';
import { random_f32 } from './Math.js';

/**
 * @typedef vec3
 * @type {[number, number, number]}
 */

/**
 * @typedef vec4
 * @type {[number, number, number, number]}
 */

class VectorFactory {
    add(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    sub(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    mul(a, b) {
        return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
    }

    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    addVal(a, val) {
        return [a[0] + val, a[1] + val, a[2] + val];
    }

    scale(a, factor) {
        return [a[0] * factor, a[1] * factor, a[2] * factor];
    }

    length(a) {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    }
}

const random_vec3 = () => {
    return [ti.random(), ti.random(), ti.random()];
};

const random_range_vec3 = (min, max) => {
    return [random_f32(min, max), random_f32(min, max), random_f32(min, max)];
};

const random_in_unit_sphere_vec3 = () => {
    let res = [0.0, 0.0, 0.0];
    while (true) {
        const p = random_range_vec3(-1, 1);
        if (p.normSqr() < 1) {
            res = p;
            break;
        }
    }
    return res;
};

const random_unit_vec3 = () => ti.normalized(random_in_unit_sphere_vec3());

const random_on_hemisphere_vec3 = (normal) => {
    const on_unit_sphere = random_unit_vec3();
    let res = -on_unit_sphere;
    if (ti.dot(on_unit_sphere, normal) > 0) {
        res = on_unit_sphere;
    }
    return res;
};

const random_in_unit_disk_vec3 = () => {
    let res = [0.0, 0.0, 0.0];
    while (true) {
        const p = [random_f32(-1, 1), random_f32(-1, 1), 0];
        if (p.normSqr() < 1) {
            res = p;
            break;
        }
    }
    return res;
};

const reflect_vec3 = (v, n) => {
    return v - 2 * ti.dot(v, n) * n;
};

const refract_vec3 = (uv, n, etai_over_etat) => {
    const cos_theta = ti.min(ti.dot(-uv, n), 1.0);
    const r_out_perp = etai_over_etat * (uv + cos_theta * n);
    const r_out_parallel = -Math.sqrt(ti.abs(1.0 - r_out_perp.normSqr())) * n;
    return r_out_perp + r_out_parallel;
};

const near_zero_vec3 = (vec) => {
    return ti.abs(vec.x) < EPS && ti.abs(vec.y) < EPS && ti.abs(vec.z) < EPS;
};

export {
    random_f32,
    random_vec3,
    random_range_vec3,
    random_in_unit_sphere_vec3,
    random_unit_vec3,
    random_on_hemisphere_vec3,
    random_in_unit_disk_vec3,
    near_zero_vec3,
    reflect_vec3,
    refract_vec3,
};

export default VectorFactory;
