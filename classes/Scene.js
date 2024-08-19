import * as ti from '../lib/taichi.js';
import { Hittable } from './Hittable.js';
import { hit_sphere } from './Sphere.js';
import { OBJ_TYPE } from '../const.js';
import { Materials } from './Material.js';
import { get_interval } from './Interval.js';

const Scene = ti.field(Hittable, 1000);

/**
 * Initialize the scene
 * @param {object[]} obj_list
 * @param {import("./Material.js").Material[]} mat_list
 */
const init_scene = async (obj_list, mat_list) => {
    for (let i = 0; i < obj_list.length; i++) {
        await Scene.set([i], obj_list[i]);
    }

    for (let i = 0; i < mat_list.length; i++) {
        await Materials.set([i], mat_list[i]);
    }
};

/**
 * Checks if a ray intersects with any object in the scene.
 * @param {import("./Ray.js").Ray} r
 * @param {import("./Interval.js").Interval} ray_t
 * @param {HitRecord} rec
 */
const hit_scene = (r, ray_t, rec) => {
    let temp_rec = {
        p: [0.0, 0.0, 0.0],
        normal: [0.0, 0.0, 0.0],
        t: 0.0,
        front_face: true,
        mat: -1,
    };
    let hit_anything = false;
    let closest_so_far = ti.f32(ray_t.max);

    for (let i of ti.range(Scene.dimensions[0])) {
        const obj = Scene[i];

        if (obj.type === OBJ_TYPE.SPHERE) {
            if (hit_sphere(obj, r, get_interval(ray_t.min, closest_so_far), temp_rec)) {
                hit_anything = true;
                closest_so_far = temp_rec.t;

                rec.p = temp_rec.p;
                rec.normal = temp_rec.normal;
                rec.t = temp_rec.t;
                rec.front_face = temp_rec.front_face;
                rec.mat = temp_rec.mat;
            }
        }
    }

    return hit_anything;
};

export { Scene, init_scene, hit_scene };
