import * as ti from '../lib/taichi.js';

import { OBJ_TYPE } from '../const.js';
import { AABB, get_aabb, get_aabb_points, get_longest_aabb_axis, get_aabb_bbox, get_aabb_centroid } from './AABB.js';
import { get_interval_axis } from './Interval.js';
import { get_sphere_aabb } from './Sphere.js';

const BVHNode = ti.types.struct({
    parent_index: ti.i32,
    is_leaf: ti.i32,
    right_index: ti.i32,
    left_index: ti.i32,
    primitive_index: ti.i32,
    bbox: AABB,
});

const compare_bvh_nodes = (a, b, axis_index) => {
    const a_axis_interval = get_interval_axis(a, axis_index);
    const b_axis_interval = get_interval_axis(b, axis_index);

    return a_axis_interval.min < b_axis_interval.min;
};

class BVHBuilder {
    #primitives;
    #nodes;

    constructor(primitives) {
        this.#primitives = primitives;
        this.#nodes = [];
    }

    build() {
        const rootIndex = this.#buildRecursive(0, this.#primitives.length, -1);
        this.setNextIndices(rootIndex, -1);

        return this.#nodes;
    }

    #buildRecursive(start, end, parent_index) {
        const currentIndex = this.#nodes.length;
        this.#nodes.push({
            bbox: get_aabb(),
            left_index: -1,
            right_index: -1,
            parent_index: -1,
            primitive_index: -1,
        });
        this.#nodes[currentIndex].parent_index = parent_index;

        const numPrimitives = end - start;

        if (numPrimitives === 1) {
            // Leaf node
            this.#nodes[currentIndex].left_index = -1;
            this.#nodes[currentIndex].right_index = -1;
            this.#nodes[currentIndex].primitive_index = start;
            this.#nodes[currentIndex].bbox = this.#primitives[start];
            return currentIndex;
        }

        // Compute bounds of all primitives in this node
        let centroid_bounds = null;
        for (let i = start; i < end; i++) {
            const centroid = get_aabb_centroid(this.#primitives[i]);
            centroid_bounds = centroid_bounds
                ? get_aabb_bbox(centroid_bounds, get_aabb_points(centroid, centroid))
                : get_aabb_points(centroid, centroid);
        }

        const axis = get_longest_aabb_axis(centroid_bounds);

        // Sort primitives based on the centroid of their bounding boxes
        this.#primitives.slice(start, end).sort((a, b) => {
            return get_aabb_centroid(a)[axis] - get_aabb_centroid(b)[axis];
        });

        const mid = start + Math.floor(numPrimitives / 2);

        // Recursively build left and right subtrees
        this.#nodes[currentIndex].left_index = this.#buildRecursive(start, mid, currentIndex);
        this.#nodes[currentIndex].right_index = this.#buildRecursive(mid, end, currentIndex);
        this.#nodes[currentIndex].primitive_index = -1; // Not a leaf node

        // Compute bounding box for this node
        this.#nodes[currentIndex].bbox = get_aabb_bbox(
            this.#nodes[this.#nodes[currentIndex].left_index].bbox,
            this.#nodes[this.#nodes[currentIndex].right_index].bbox,
        );

        return currentIndex;
    }

    setNextIndices(node_index, next_index) {
        if (node_index === -1) return;

        const node = this.#nodes[node_index];
        node.next_index = next_index;

        if (node.left_index !== -1 && node.right_index !== -1) {
            this.setNextIndices(node.left_index, node.right_index);
            this.setNextIndices(node.right_index, next_index);
        }
    }
}

/**
 * @param {import("./Hittable.js").Hittable[]} obj_list
 */
function build_bvh_from_obj(obj_list) {
    const primitives = obj_list.map((obj) => {
        let bbox = null;
        if (obj.type === OBJ_TYPE.SPHERE) {
            bbox = get_sphere_aabb(obj);
        }
        return bbox;
    });

    const builder = new BVHBuilder(primitives);
    const tree = builder.build();

    return tree.map((node) => {
        return {
            parent_index: node.parent_index,
            is_leaf: node.right_index === -1 && node.left_index === -1,
            left_index: node.left_index,
            right_index: node.next_index,
            primitive_index: node.primitive_index,
            bbox: node.bbox,
        };
    });
}

export { BVHNode, build_bvh_from_obj, compare_bvh_nodes };
