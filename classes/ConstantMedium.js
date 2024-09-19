/* global Scene, Materials */
import * as ti from '../lib/taichi.js';

import { MAX_F32, OBJ_TYPE } from '../const.js';
import { new_hit_record } from './Hittable.js';
import { get_interval, get_interval_universal } from './Interval.js';
import { new_ray, ray_at } from './Ray.js';
import { hit_sphere } from './Sphere.js';
// import { hit_quad } from './Quad.js';
// import { hit_aabb } from './AABB.js';

/**
 * @param {object} medium
 * @param {import('./Ray').TRay} r
 * @param {import('./Interval.js').Interval} ray_t
 * @param {import('./Hittable.js').HitRecord} rec
 * @returns {boolean}
 */
const hit_constant_medium = (medium, r, ray_t, rec) => {
    const ray = new_ray(r.origin, r.direction, r.time);
    const rec1 = new_hit_record();
    const rec2 = new_hit_record();

    let type = OBJ_TYPE.BOX;
    if (medium.radius > 0) {
        type = OBJ_TYPE.SPHERE;
    }

    let res = true;
    if (type === OBJ_TYPE.SPHERE && !hit_sphere(medium, ray, get_interval_universal(), rec1)) {
        res = false;
    }

    if (res && type === OBJ_TYPE.SPHERE && !hit_sphere(medium, ray, get_interval(rec1.t + 0.0001, MAX_F32), rec2)) {
        res = false;
    }

    if (res) {
        rec1.t = Math.max(rec1.t, ray_t.min);
        rec2.t = Math.min(rec2.t, ray_t.max);
        if (rec1.t >= rec2.t) {
            res = false;
        }

        if (res) {
            rec1.t = Math.max(rec1.t, 0);
            const ray_length = r.direction.normSqr();
            const distance_inside_boundary = (rec2.t - rec1.t) * ray_length;
            const neg_inv_density = -1.0 / Materials[medium.mat].k;
            const hit_distance = neg_inv_density * Math.log(ti.random());
            if (hit_distance > distance_inside_boundary) {
                res = false;
            }
            if (res) {
                rec.t = rec1.t + hit_distance / ray_length;
                rec.p = ray_at(r, rec.t);
                rec.mat = medium.mat;
            }
        }
    }

    return res;
};

export { hit_constant_medium };
