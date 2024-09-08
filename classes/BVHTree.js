import * as ti from '../lib/taichi.js';
import { ray_at } from './Ray.js';
import { K_AABB, AABB, get_aabb_points } from './AABB.js';
import { get_interval_axis } from './Interval.js';
import { get_sphere_aabb } from './Sphere.js';
import VectorFactory from './Vector.js';
const vf = new VectorFactory();

const compare_bvh_nodes = (a, b, axis_index) => {
    const a_axis_interval = get_interval_axis(a, axis_index);
    const b_axis_interval = get_interval_axis(b, axis_index);

    return a_axis_interval.min < b_axis_interval.min;
};

const BVHNode = ti.types.struct({
    parent_index: ti.i32,
    is_leaf: ti.i32,
    right_index: ti.i32,
    left_index: ti.i32,
    primitive_index: ti.i32,
    bbox: AABB,
});

let BVHTree = ti.field(BVHNode, 0);

class K_BVHBuilder {
    constructor(primitives) {
        this.primitives = primitives;
        this.nodes = [];
    }

    build() {
        const rootIndex = this.buildRecursive(0, this.primitives.length, -1);
        this.setNextIndices(rootIndex, -1);
        return rootIndex;
    }

    buildRecursive(start, end, parent_index) {
        const currentIndex = this.nodes.length;
        this.nodes.push({
            bbox: new K_AABB(),
            left_index: -1,
            right_index: -1,
            parent_index: -1,
            primitive_index: -1,
        });
        this.nodes[currentIndex].parent_index = parent_index;

        const numPrimitives = end - start;

        if (numPrimitives === 1) {
            // Leaf node
            this.nodes[currentIndex].left_index = -1;
            this.nodes[currentIndex].right_index = -1;
            this.nodes[currentIndex].primitive_index = start;
            this.nodes[currentIndex].bbox = this.primitives[start];
            return currentIndex;
        }

        // Compute bounds of all primitives in this node
        let centroid_bounds = null;
        for (let i = start; i < end; i++) {
            const centroid = this.primitives[i].centroid();
            centroid_bounds = centroid_bounds
                ? K_AABB.surroundingBox(centroid_bounds, new K_AABB(centroid, centroid))
                : new K_AABB(centroid, centroid);
        }

        const axis = centroid_bounds.longestAxis();

        // Sort primitives based on the centroid of their bounding boxes
        this.primitives.slice(start, end).sort((a, b) => {
            return a.centroid()[axis] - b.centroid()[axis];
        });

        const mid = start + Math.floor(numPrimitives / 2);

        // Recursively build left and right subtrees
        this.nodes[currentIndex].left_index = this.buildRecursive(start, mid, currentIndex);
        this.nodes[currentIndex].right_index = this.buildRecursive(mid, end, currentIndex);
        this.nodes[currentIndex].primitive_index = -1; // Not a leaf node

        // Compute bounding box for this node
        this.nodes[currentIndex].bbox = K_AABB.surroundingBox(
            this.nodes[this.nodes[currentIndex].left_index].bbox,
            this.nodes[this.nodes[currentIndex].right_index].bbox,
        );

        return currentIndex;
    }

    setNextIndices(node_index, next_index) {
        if (node_index === -1) return;

        const node = this.nodes[node_index];
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
async function build_bvh_from_obj(obj_list) {
    const primitives = obj_list.map((obj) => {
        let bbox = null;
        // sphere
        bbox = get_sphere_aabb(obj);
        return bbox;
    });

    const builder = new K_BVHBuilder(primitives);
    builder.build();

    const res = builder.nodes.map((node) => {
        return {
            parent_index: node.parent_index,
            is_leaf: node.right_index === -1 && node.left_index === -1,
            left_index: node.left_index,
            right_index: node.next_index,
            primitive_index: node.primitive_index,
            bbox: get_aabb_points(node.bbox.min, node.bbox.max),
        };
    });

    console.log(res);

    BVHTree = ti.field(BVHNode, res.length);
    for (let i = 0; i < res.length; i++) {
        await BVHTree.set([i], res[i]);
    }
}

export { BVHTree, build_bvh_from_obj, compare_bvh_nodes };
