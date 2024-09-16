/* global BVHTree, Scene */
import * as ti from '../lib/taichi.js';

import { get_record_from_struct, OBJ_TYPE } from '../const.js';
import { get_rotation_matrix } from './Vector.js';
import { translate_ray, rotate_ray } from './Ray.js';
import { Hittable } from './Hittable.js';
import { hit_sphere } from './Sphere.js';
import { hit_quad } from './Quad.js';
import { init_materials } from './Material.js';
import { get_interval } from './Interval.js';
import { hit_aabb } from './AABB.js';
import { build_bvh_from_obj } from './BVHTree.js';
import { init_textures } from './Texture.js';

const base_obj = get_record_from_struct(Hittable);

/**
 * @typedef Scene
 * @property {string} name
 * @property {import("./Hittable.js").THittable[]} objects
 * @property {import("./Material.js").TMaterial[]} materials
 * @property {import("./Texture.js").TTexture[]} textures
 * @property {object} camera
 */

/**
 * Initialize the scene
 * @param {Scene} scene_data
 */
const init_scene = async (scene_data, scene_field, lights_field, bvh_tree_field, materials_field, textures_field, obj_counter) => {
    const { objects, lights = [], materials = [], textures = [] } = scene_data;
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        await scene_field.set([i], {
            ...base_obj,
            ...obj,
        });
    }
    for (let i = 0; i < lights.length; i++) {
        const obj = lights[i];
        await lights_field.set([i], {
            ...base_obj,
            ...obj,
        });
    }
    await init_materials(materials, materials_field);
    await init_textures(textures, textures_field);
    const tree = build_bvh_from_obj(objects);
    for (let i = 0; i < tree.length; i++) {
        await bvh_tree_field.set([i], tree[i]);
    }
    await obj_counter.fromArray([objects.length, lights.length, materials.length, textures.length]);
};

const hit_object = (obj, r, ray_t, rec) => {
    let res = false;

    const has_offset = ti.sum(obj.offset) !== 0;
    const has_rotation = ti.sum(obj.rotation) !== 0;

    let ray = r;
    if (has_offset) {
        ray = translate_ray(ray, obj.offset);
    }
    if (has_rotation) {
        ray = rotate_ray(ray, obj.rotation);
    }

    if (obj.type === OBJ_TYPE.SPHERE) {
        res = hit_sphere(obj, ray, ray_t, rec);
    }
    if (obj.type === OBJ_TYPE.QUAD) {
        res = hit_quad(obj, ray, ray_t, rec);
    }

    if (res) {
        if (has_rotation) {
            const rot_mat = get_rotation_matrix(obj.rotation);

            rec.normal = ti.matmul(ti.transpose(rot_mat), rec.normal);
            rec.p = ti.matmul(ti.transpose(rot_mat), rec.p);
        }

        if (has_offset) {
            rec.p += obj.offset;
        }
    }

    return res;
};

/**
 * Checks if a ray intersects with any object in the scene.
 * @param {import("./Ray.js").TRay} r
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
                const obj = Scene[current_node.primitive_index];
                let hit_this = hit_object(obj, r, local_it, rec);
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

export { init_scene, hit_object, hit_scene };
