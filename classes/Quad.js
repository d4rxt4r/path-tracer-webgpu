import * as ti from '../lib/taichi.js';

import { ray_at } from './Ray.js';
import { set_face_normal } from './Hittable.js';
import { get_interval, interval_contains } from './Interval.js';
import { get_aabb_points, get_aabb_bbox } from './AABB.js';
import vf from './Vector.js';

const get_quad_bbox = (quad) => {
    const { Q, u, v } = quad;

    const bbox_diagonal1 = get_aabb_points(Q, vf.add(vf.add(Q, u), v));
    const bbox_diagonal2 = get_aabb_points(vf.add(Q, u), vf.add(Q, v));
    return get_aabb_bbox(bbox_diagonal1, bbox_diagonal2);
};

const get_quad_normal = (u, v) => {
    const n = ti.cross(u, v);
    return ti.normalized(n);
};

const get_quad_d = (Q, normal) => {
    return ti.dot(normal, Q);
};

const get_quad_w = (n) => {
    return n / ti.dot(n, n);
};

const quad_is_interior = (a, b, rec) => {
    let res = true;

    const unit_interval = get_interval(0, 1);
    // Given the hit point in plane coordinates, return false if it is outside the
    // primitive, otherwise set the hit record UV coordinates and return true.

    if (!interval_contains(unit_interval, a) || !interval_contains(unit_interval, b)) {
        res = false;
    }

    if (res) {
        rec.u = a;
        rec.v = b;
    }

    return res;
};

const hit_quad = (quad, r, ray_t, rec) => {
    const normal = get_quad_normal(quad.u, quad.v);
    const D = get_quad_d(quad.Q, normal);
    const denom = ti.dot(normal, r.direction);

    let res = true;

    // No hit if the ray is parallel to the plane.
    if (ti.abs(denom) < 1e-8) {
        res = false;
    }

    if (res) {
        // Return false if the hit point parameter t is outside the ray interval.
        const t = (D - ti.dot(normal, r.origin)) / denom;

        if (!interval_contains(ray_t, t)) {
            res = false;
        }

        if (res) {
            // Determine if the hit point lies within the planar shape using its plane coordinates.
            const intersection = ray_at(r, t);
            const planar_hitpt_vector = intersection - quad.Q;
            const w = get_quad_w(ti.cross(quad.u, quad.v));
            const alpha = ti.dot(w, ti.cross(planar_hitpt_vector, quad.v));
            const beta = ti.dot(w, ti.cross(quad.u, planar_hitpt_vector));

            if (!quad_is_interior(alpha, beta, rec)) {
                res = false;
            }

            if (res) {
                rec.t = t;
                rec.p = intersection;
                rec.mat = quad.mat;
                set_face_normal(rec, r, normal);
            }
        }
    }

    return res;
};

export { get_quad_bbox, get_quad_normal, get_quad_d, get_quad_w, quad_is_interior, hit_quad };
