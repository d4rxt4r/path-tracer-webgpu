import * as ti from '../lib/taichi.js';

/**
 * @typedef HitRecord
 * @property {import("./Vector.js").vec3} p
 * @property {import("./Vector.js").vec3} normal
 * @property {number} mat
 * @property {number} t
 * @property {boolean} front_face
 */

/**
 * Sets the hit record normal vector.
 * NOTE: the parameter `outward_normal` is assumed to have unit length.
 * @param {HitRecord} rec
 * @param {import("./Ray.js").Ray} r
 * @param {import("./Vector.js").vec3} outward_normal
 */
const set_face_normal = (rec, r, outward_normal) => {
    const is_front_face = ti.dot(r.direction, outward_normal) < 0;
    if (is_front_face) {
        rec.front_face = true;
        rec.normal = outward_normal;
    } else {
        rec.front_face = false;
        rec.normal = -outward_normal;
    }
};

/**
 * @typedef Hittable
 * @property {number} type
 * @property {number} mat
 * @property {import("./Vector.js").vec3} Q
 * @property {number} radius
 * @property {import("./Vector.js").vec3} center
 * @property {import("./Vector.js").vec3} center2
 */

const Hittable = ti.types.struct({
    type: ti.i32,
    mat: ti.i32,
    // quad
    Q: ti.types.vector(ti.f32, 3),
    // u: ti.types.vector(ti.f32, 3),
    // v: ti.types.vector(ti.f32, 3),
    // sphere
    radius: ti.f32,
    center: ti.types.vector(ti.f32, 3),
    center2: ti.types.vector(ti.f32, 3),
});

export { Hittable, set_face_normal };
