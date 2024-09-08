import * as ti from '../lib/taichi.js';
import { Hittable } from './Hittable.js';
import { hit_sphere } from './Sphere.js';
import { init_materials } from './Material.js';
import { get_interval } from './Interval.js';
import { hit_aabb } from './AABB.js';
import { BVHTree, build_bvh_from_obj } from './BVHTree.js';

let Scene = ti.field(Hittable, 0);

const hittable_types = Hittable.memberTypes_;
const base_obj = {};
hittable_types.forEach((type, key) => {
    if (type.primitiveType_ === 'i32') {
        base_obj[key] = type.numRows_ ? [0, 0, 0] : 0;
    } else {
        base_obj[key] = type.numRows_ ? [0.0, 0.0, 0.0] : 0.0;
    }
});

/**
 * @typedef Scene
 * @property {string} name
 * @property {import("./classes/Hittable.js").Hittable[]} objects
 * @property {import("./classes/Material.js").Material[]} materials
 * @property camera
 */

/**
 * Initialize the scene
 * @param {Scene} scene
 */
const init_scene = async (scene) => {
    const { objects, materials } = scene;
    Scene = ti.field(Hittable, objects.length);

    await build_bvh_from_obj(objects);

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];

        await Scene.set([i], {
            ...base_obj,
            ...obj,
        });
    }

    await init_materials(materials);
};

/**
 * Checks if a ray intersects with any object in the scene.
 * @param {import("./Ray.js").Ray} r
 * @param {import("./Interval.js").Interval} ray_t
 * @param {HitRecord} rec
 */
const hit_scene = (r, ray_t, rec) => {
    let root_index = 0;
    let current_index = root_index;

    let hit_anything = false;
    let current_t = ray_t;

    while (current_index != -1) {
        let current_node = BVHTree[current_index];

        let local_it = get_interval(ray_t.min, current_t.max);
        if (hit_aabb(r, local_it, current_node.bbox)) {
            if (current_node.is_leaf) {
                // Leaf node
                let hit_this = hit_sphere(Scene[current_node.primitive_index], r, local_it, rec);
                if (hit_this) {
                    hit_anything = true;
                    current_t.max = rec.t;
                    ray_t = current_t;
                }
            } else {
                // Internal node, visit left child
                current_index = current_node.left_index;
                continue;
            }
        }

        // Move to the next node in the "rope"
        current_index = current_node.right_index;
    }

    return hit_anything;
};

export { Scene, init_scene, hit_scene };
