import * as ti from '../lib/taichi.js';

import { EPS } from '../const.js';
import { random_f32, degrees_to_radians } from './Math.js';

/**
 * @typedef vec3
 * @type {[number, number, number]}
 */

/**
 * @typedef vec4
 * @type {[number, number, number, number]}
 */

class VectorFactory {
    /**
     * @returns {vec3}
     */
    add(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    /**
     * @returns {vec3}
     */
    sub(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    /**
     * @returns {vec3}
     */
    mul(a, b) {
        return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
    }

    /**
     * @returns {vec3}
     */
    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    /**
     * @param {vec3} a
     * @param {number} val
     * @returns {vec3}
     */
    addVal(a, val) {
        return this.add(a, [val, val, val]);
    }

    /**
     * @returns {vec3}
     */
    scale(a, factor) {
        return [a[0] * factor, a[1] * factor, a[2] * factor];
    }

    /**
     * @returns {number}
     */
    length(a) {
        return Math.sqrt(this.lengthSqr(a));
    }

    /**
     * @returns {vec3}
     */
    lengthSqr(a) {
        return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
    }

    /**
     * @returns {vec3}
     */
    normalized(a) {
        const len = this.length(a);
        if (len > EPS) {
            return [a[0] / len, a[1] / len, a[2] / len];
        }
        return a;
    }

    /**
     * @returns {vec3}
     */
    cross(a, b) {
        return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }

    min(a, b) {
        return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
    }

    max(a, b) {
        return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
    }

    rotateAxisAngle(v, axis, angle) {
        const cosTheta = Math.cos(angle);
        const sinTheta = Math.sin(angle);
        const dotProduct = this.dot(v, axis);

        const x = axis[0] * dotProduct * (1 - cosTheta) + v[0] * cosTheta + (-axis[2] * v[1] + axis[1] * v[2]) * sinTheta;
        const y = axis[1] * dotProduct * (1 - cosTheta) + v[1] * cosTheta + (axis[2] * v[0] - axis[0] * v[2]) * sinTheta;
        const z = axis[2] * dotProduct * (1 - cosTheta) + v[2] * cosTheta + (-axis[1] * v[0] + axis[0] * v[1]) * sinTheta;

        return [x, y, z];
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

const random_cosine_direction_vec3 = () => {
    const r1 = ti.random();
    const r2 = ti.random();

    const phi = 2 * Math.PI * r1;
    const x = Math.cos(phi) * Math.sqrt(r2);
    const y = Math.sin(phi) * Math.sqrt(r2);
    const z = Math.sqrt(1 - r2);

    return [x, y, z];
};

const random_to_sphere = (radius, distance_squared) => {
    const r1 = ti.random();
    const r2 = ti.random();
    const z = 1 + r2 * (Math.sqrt(1 - (radius * radius) / distance_squared) - 1);

    const phi = 2 * Math.PI * r1;
    const x = Math.cos(phi) * Math.sqrt(1 - z * z);
    const y = Math.sin(phi) * Math.sqrt(1 - z * z);

    return [x, y, z];
};

const get_rotation_matrix = (rotation) => {
    const rad_x = degrees_to_radians(rotation.x);
    const rad_y = degrees_to_radians(rotation.y);
    const rad_z = degrees_to_radians(rotation.z);

    const cos_x = Math.cos(rad_x);
    const sin_x = Math.sin(rad_x);
    const cos_y = Math.cos(rad_y);
    const sin_y = Math.sin(rad_y);
    const cos_z = Math.cos(rad_z);
    const sin_z = Math.sin(rad_z);

    const rot_mat = [
        [cos_y * cos_z, cos_y * sin_z, -sin_y],
        [sin_x * sin_y * cos_z - cos_x * sin_z, sin_x * sin_y * sin_z + cos_x * cos_z, sin_x * cos_y],
        [cos_x * sin_y * cos_z + sin_x * sin_z, cos_x * sin_y * sin_z - sin_x * cos_z, cos_x * cos_y],
    ];

    return rot_mat;
};

export {
    random_vec3,
    random_range_vec3,
    random_in_unit_sphere_vec3,
    random_unit_vec3,
    random_on_hemisphere_vec3,
    random_in_unit_disk_vec3,
    random_to_sphere,
    near_zero_vec3,
    reflect_vec3,
    refract_vec3,
    random_cosine_direction_vec3,
    get_rotation_matrix,
};

const vf = new VectorFactory();

export default vf;
