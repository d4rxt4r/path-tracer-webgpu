import { prepare_scene } from '../renderer/SceneData.js';
import { upload_scene } from '../renderer/Upload.js';
/* global BVHTree, Scene, COUNTER, Boxes */

import { OBJ_TYPE } from '../const.js';
import { hit_sphere } from './Sphere.js';
import { hit_quad } from './Quad.js';
import { get_interval } from './Interval.js';
import { hit_aabb } from './AABB.js';
import { hit_constant_medium } from './ConstantMedium.js';
import { hit_box } from './Box.js';

/** CPU validation/preparation and GPU upload are separate from kernel intersection helpers. */
const init_scene = async (
    scene_data,
    scene_field,
    lights_field,
    bvh_tree_field,
    materials_field,
    textures_field,
    obj_counter,
    boxes_field,
) => {
    const prepared = prepare_scene(scene_data);
    await upload_scene(prepared, {
        Scene: scene_field,
        Lights: lights_field,
        BVHTree: bvh_tree_field,
        Materials: materials_field,
        Textures: textures_field,
        COUNTER: obj_counter,
        Boxes: boxes_field,
    });
};

// Inputs are prepared world-space records; local transforms never run per ray.
const hit_object = (obj, r, ray_t, rec) => {
    let res = false;
    if (obj.type === OBJ_TYPE.SPHERE) res = hit_sphere(obj, r, ray_t, rec);
    else if (obj.type === OBJ_TYPE.QUAD) res = hit_quad(obj, r, ray_t, rec);
    else if (obj.type === OBJ_TYPE.BOX) res = hit_box(obj, Boxes[obj.box_index], r, ray_t, rec);
    else if (obj.type === OBJ_TYPE.MEDIUM) res = hit_constant_medium(obj, r, ray_t, rec);
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
    let current_index = -1;
    if (COUNTER[0] > 0) current_index = root_index;

    let hit_anything = false;
    let current_t = ray_t;

    while (current_index != -1) {
        let current_node = BVHTree[current_index];

        let local_it = get_interval(ray_t.min, current_t.max);
        if (hit_aabb(r, local_it, current_node.bbox)) {
            if (current_node.is_leaf) {
                // Leaf node
                const obj = Scene[current_node.primitive_index];
                let hit_this = hit_object(obj, r, get_interval(ray_t.min, current_t.max), rec);
                if (hit_this) {
                    rec.object_index = current_node.primitive_index;
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
