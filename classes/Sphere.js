import * as ti from "../lib/taichi.js";
import { ray_at } from "./Ray.js";
import { set_face_normal } from "./Hittable.js";

/**
 * @param {import('./Vector').vec3} center
 * @param {number} radius
 * @param {import('./Ray').Ray} r
 * @param {number} ray_tmin
 * @param {number} ray_tmax
 * @param {import('./Hittable.js').HitRecord} rec
 * @returns {boolean}
 */
const hit_sphere = (sphere, r, ray_tmin, ray_tmax, rec) => {
    const oc = sphere.center - r.origin;
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
    if (root <= ray_tmin || ray_tmax <= root) {
        root = (h + sqrtd) / a;
        if (root <= ray_tmin || ray_tmax <= root)
            res = false;
    }

    if (res) {
        rec.t = root;
        rec.p = ray_at(r, rec.t);
        const outward_normal = (rec.p - sphere.center) / sphere.radius;
        set_face_normal(rec, r, outward_normal);
        rec.mat = sphere.mat;
    }

    return res;
}

export {
    hit_sphere
}