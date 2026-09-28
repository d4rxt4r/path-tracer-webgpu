/* global Materials, Boxes */
import * as ti from '../lib/taichi.js';
import { OBJ_TYPE } from '../const.js';
import { ray_at } from './Ray.js';
import { get_sphere_center } from './Sphere.js';
import { box_local_ray, box_interval } from './Box.js';

const hit_constant_medium = (medium, ray, ray_t, rec) => {
    let enter = 0.0;
    let exit = 0.0;
    let hit = false;
    if (medium.boundary_type === OBJ_TYPE.BOX) {
        const box = Boxes[medium.box_index];
        const interval = box_interval(box, box_local_ray(box, ray));
        hit = interval.hit;
        enter = interval.min;
        exit = interval.max;
    } else {
        const center = get_sphere_center(medium.center, medium.center2, ray.time);
        const oc = center - ray.origin;
        const a = ray.direction.normSqr();
        const h = ti.dot(ray.direction, oc);
        const c = oc.normSqr() - medium.radius * medium.radius;
        const discriminant = h * h - a * c;
        if (a > 0 && discriminant > 0) {
            const root = ti.sqrt(discriminant);
            enter = (h - root) / a;
            exit = (h + root) / a;
            hit = true;
        }
    }
    if (hit) {
        enter = ti.max(ti.max(enter, ray_t.min), 0.0);
        exit = ti.min(exit, ray_t.max);
        hit = enter < exit;
        if (hit) {
            const ray_length = ray.direction.norm();
            const distance = -ti.log(ti.max(ti.random(), 1e-8)) / Materials[medium.mat].k;
            hit = distance <= (exit - enter) * ray_length;
            if (hit) {
                rec.t = enter + distance / ray_length;
                rec.p = ray_at(ray, rec.t);
                rec.mat = medium.mat;
                rec.normal = [1.0, 0.0, 0.0];
                rec.front_face = true;
                rec.u = 0.0;
                rec.v = 0.0;
            }
        }
    }
    return hit;
};

export { hit_constant_medium };
