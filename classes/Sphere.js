import * as ti from '../lib/taichi.js';

import { new_ray, ray_at } from './Ray.js';
import { set_face_normal } from './Hittable.js';
import { get_aabb_points, get_aabb_bbox, translate_aabb, rotate_aabb } from './AABB.js';
import { interval_surrounds } from './Interval.js';
import vf from './Vector.js';

/**
 * @typedef Sphere
 * @property {import('./Vector').vec3} center
 * @property {import('./Vector').vec3} center2
 * @property {number} radius
 * @property {number} mat
 * @property {import('./Vector.js').vec3} offset
 * @property {import('./Vector').vec3} rotation
 */

const get_sphere_center = (center, center2, time) => {
    let end_center = center;
    if (center2.x + center2.y + center2.z !== 0) {
        end_center = center2 - center;
        const pos_ray = new_ray(center, end_center, 0);
        end_center = ray_at(pos_ray, time);
    }
    return end_center;
};

/**
 * @param {Sphere} sphere
 */
const get_sphere_aabb = (sphere) => {
    const { center, center2, radius, offset, rotation } = sphere;

    if (center2 && center2.x + center2.y + center2.z !== 0) {
        const box1 = get_aabb_points(vf.addVal(center, -radius), vf.addVal(center, radius));
        const box2 = get_aabb_points(vf.addVal(center2, -radius), vf.addVal(center2, radius));
        return translate_aabb(rotate_aabb(get_aabb_bbox(box1, box2), rotation), offset);
    }

    return translate_aabb(rotate_aabb(get_aabb_points(vf.addVal(center, -radius), vf.addVal(center, radius)), rotation), offset);
};

const get_sphere_uv = (p, rec) => {
    const theta = Math.acos(-p.y);
    const phi = Math.atan2(-p.z, p.x) + Math.PI;

    rec.u = phi / (2 * Math.PI);
    rec.v = theta / Math.PI;
};

/**
 * @param {Sphere} sphere
 * @param {import('./Ray').Ray} r
 * @param {import('./Interval.js').Interval} ray_t
 * @param {import('./Hittable.js').HitRecord} rec
 * @returns {boolean}
 */
const hit_sphere = (sphere, r, ray_t, rec) => {
    const current_center = get_sphere_center(sphere.center, sphere.center2, r.time);

    const oc = current_center - r.origin;
    const a = ti.normSqr(r.direction);
    const h = ti.dot(r.direction, oc);
    const c = ti.normSqr(oc) - sphere.radius * sphere.radius;

    let res = true;
    const discriminant = h * h - a * c;

    if (discriminant < 0) {
        res = false;
    }

    if (res) {
        const sqrtd = Math.sqrt(discriminant);

        let root = (h - sqrtd) / a;
        if (!interval_surrounds(ray_t, root)) {
            root = (h + sqrtd) / a;
            if (!interval_surrounds(ray_t, root)) res = false;
        }

        if (res) {
            rec.t = root;
            rec.p = ray_at(r, rec.t);
            const outward_normal = (rec.p - current_center) / sphere.radius;
            set_face_normal(rec, r, outward_normal);
            get_sphere_uv(outward_normal, rec);
            rec.mat = sphere.mat;
        }
    }

    return res;
};

export { hit_sphere, get_sphere_uv, get_sphere_center, get_sphere_aabb };
