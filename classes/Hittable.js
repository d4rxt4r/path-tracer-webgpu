import * as ti from '../lib/taichi.js';

/**
 * @typedef HitRecord
 * @property {import("./Vector.js").vec3} p
 * @property {import("./Vector.js").vec3} normal
 * @property {number} mat
 * @property {number} t
 * @property {boolean} front_face
 * @property {import("./Vector.js").vec3} u
 * @property {import("./Vector.js").vec3} v
 */

const new_hit_record = () => {
    return {
        p: [0.0, 0.0, 0.0],
        normal: [0.0, 0.0, 0.0],
        t: 0.0,
        front_face: true,
        mat: -1,
        u: [0.0, 0.0, 0.0],
        v: [0.0, 0.0, 0.0],
    };
};

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
 * @typedef THittable
 * @property {number} type
 * @property {number} mat
 * @property {import("./Vector.js").vec3} Q
 * @property {import("./Vector.js").vec3} u
 * @property {import("./Vector.js").vec3} v
 * @property {number} radius
 * @property {import("./Vector.js").vec3} center
 * @property {import("./Vector.js").vec3} center2
 */

const Hittable = ti.types.struct({
    type: ti.i32,
    mat: ti.i32,
    // quad
    Q: ti.types.vector(ti.f32, 3),
    u: ti.types.vector(ti.f32, 3),
    v: ti.types.vector(ti.f32, 3),
    // sphere
    radius: ti.f32,
    center: ti.types.vector(ti.f32, 3),
    center2: ti.types.vector(ti.f32, 3),
});

export { Hittable, new_hit_record, set_face_normal };
