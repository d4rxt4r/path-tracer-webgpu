import * as ti from '../lib/taichi.js';

/**
 * @typedef HitRecord
 * @property {import("./Vector.js").vec3} p
 * @property {import("./Vector.js").vec3} normal
 * @property {number} mat
 * @property {number} t
 * @property {boolean} front_face
 * @property {number} u
 * @property {number} v
 */

const new_hit_record = () => {
    return {
        // position
        p: [0.0, 0.0, 0.0],
        // normal
        normal: [0.0, 0.0, 0.0],
        geometric_normal: [0.0, 0.0, 0.0],
        mapped: false,
        object_index: -1,
        // time
        t: 0.0,
        // front face
        front_face: true,
        // material
        mat: -1,
        // texture coordinates
        u: 0.0,
        v: 0.0,
    };
};

/**
 * Sets the hit record normal vector.
 * NOTE: the parameter `outward_normal` is assumed to have unit length.
 * @param {HitRecord} rec
 * @param {import("./Ray.js").TRay} r
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
    boundary_type: ti.i32,
    box_index: ti.i32,
    uv_rotated: ti.i32,
    // material
    mat: ti.i32,
    // Quad basis; rotated spheres reuse u/v/normal for their local UV axes.
    Q: ti.types.vector(ti.f32, 3),
    u: ti.types.vector(ti.f32, 3),
    v: ti.types.vector(ti.f32, 3),
    normal: ti.types.vector(ti.f32, 3),
    plane_d: ti.f32,
    quad_w: ti.types.vector(ti.f32, 3),
    area: ti.f32,
    // sphere
    radius: ti.f32,
    center: ti.types.vector(ti.f32, 3),
    center2: ti.types.vector(ti.f32, 3),
});

export { Hittable, new_hit_record, set_face_normal };
