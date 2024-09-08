import * as ti from '../lib/taichi.js';
import { new_ray, ray_at } from './Ray.js';
import { set_face_normal } from './Hittable.js';
import { get_aabb_points, get_aabb_bbox } from './AABB.js';
import { interval_surrounds } from './Interval.js';

/**
 * @typedef Sphere
 * @property {import('./Vector').vec3} center
 * @property {import('./Vector').vec3} center2
 * @property {number} radius
 * @property {number} mat
 */

const get_sphere_center = (center, center2, time) => {
    let end_center = center2;
    if (center2.x + center2.y + center2.z !== 0) {
        end_center = center2 - center;
    }
    const pos_ray = new_ray(center, end_center, 0);
    return ray_at(pos_ray, time);
};

const get_sphere_aabb = (sphere) => {
    let center2 = sphere.center2;
    let bbox = get_aabb_points(sphere.center - sphere.radius, sphere.center + sphere.radius);

    if (center2.x + center2.y + center2.z !== 0) {
        center2 = center2 - center;
        const center = new_ray(center, center2, 0);
        const box1 = get_aabb_points(ray_at(center, 0) - sphere.radius, ray_at(center, 0) + sphere.radius);
        const box2 = get_aabb_points(ray_at(center, 1) - sphere.radius, ray_at(center, 1) + sphere.radius);
        bbox = get_aabb_bbox(box1, box2);
    }

    return bbox;
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

    const sqrtd = Math.sqrt(discriminant);

    let root = (h - sqrtd) / a;
    if (!interval_surrounds(root, ray_t)) {
        root = (h + sqrtd) / a;
        if (!interval_surrounds(root, ray_t)) res = false;
    }

    if (res) {
        rec.t = root;
        rec.p = ray_at(r, rec.t);
        const outward_normal = (rec.p - current_center) / sphere.radius;
        set_face_normal(rec, r, outward_normal);
        rec.mat = sphere.mat;
    }

    return res;
};

export { hit_sphere, get_sphere_center, get_sphere_aabb };
