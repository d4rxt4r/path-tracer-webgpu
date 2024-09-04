import * as ti from '../lib/taichi.js';
import { Hittable } from './Hittable.js';
import { hit_sphere } from './Sphere.js';
import { init_materials } from './Material.js';
import { get_interval } from './Interval.js';
import { hit_aabb } from './AABB.js';
import { BVHNodes, init_bvh_nodes } from './BVHNode.js';

let Scene = ti.field(Hittable, 0);

/**
 * Initialize the scene
 * @param {object[]} obj_list
 * @param {import("./Material.js").Material[]} mat_list
 */
const init_scene = async (obj_list, mat_list) => {
    Scene = ti.field(Hittable, obj_list.length);

    await init_bvh_nodes(obj_list);

    for (let i = 0; i < obj_list.length; i++) {
        const obj = obj_list[i];
        await Scene.set([i], obj);
    }

    await init_materials(mat_list);
};

/**
 * Checks if a ray intersects with any object in the scene.
 * @param {import("./Ray.js").Ray} r
 * @param {import("./Interval.js").Interval} ray_t
 * @param {HitRecord} rec
 */
const hit_scene = (r, ray_t, rec) => {
    let hit_anything = false;
    let closest_so_far = ti.f32(ray_t.max);

    // TODO: implement proper tree traversal algorithm
    // this one does not check for parent nodes
    for (let i of ti.range(BVHNodes.dimensions[0])) {
        const current_node = BVHNodes[i];
        const is_parent = current_node.is_parent === 1;
        if (is_parent) {
            continue;
        }

        let left_t = get_interval(ray_t.min, closest_so_far);
        const hit_box_l = hit_aabb(r, left_t, current_node.bbox);

        if (!hit_box_l) {
            continue;
        }

        let hit_r = hit_sphere(Scene[current_node.left_id], r, left_t, rec);
        if (hit_sphere(Scene[current_node.left_id], r, left_t, rec)) {
            hit_anything = true;
            ray_t = left_t;
            closest_so_far = rec.t;
        }

        if (current_node.left_id !== current_node.right_id) {
            let right_t = get_interval(left_t.min, ray_t.max);
            if (hit_r) {
                right_t.max = closest_so_far;
            }

            if (hit_sphere(Scene[current_node.right_id], r, right_t, rec)) {
                hit_anything = true;
                ray_t = right_t;
                closest_so_far = rec.t;
            }
        }
    }

    return hit_anything;
};

export { Scene, init_scene, hit_scene };
