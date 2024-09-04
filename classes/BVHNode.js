import * as ti from '../lib/taichi.js';
import { AABB, get_aabb_bbox, get_aabb_points, get_longest_aabb_axis } from './AABB.js';
import { get_interval, get_interval_axis } from './Interval.js';
import VectorFactory from './Vector.js';
const vf = new VectorFactory();

const BVHNode = ti.types.struct({
    is_parent: ti.i32,
    left_id: ti.i32,
    right_id: ti.i32,
    bbox: AABB,
});

let BVHNodes = ti.field(BVHNode, 0);

const compare_bvh_nodes = (a, b, axis_index) => {
    const a_axis_interval = get_interval_axis(a, axis_index);
    const b_axis_interval = get_interval_axis(b, axis_index);

    return a_axis_interval.min < b_axis_interval.min;
};

/**
 * @param {object[]} obj_list
 */
const init_bvh_nodes = async (obj_list) => {
    const get_bvh_tree = (objects, start, end) => {
        const bvh_node = {
            left_id: null,
            right_id: null,
            is_parent: false,
            bbox: {
                x: get_interval(),
                y: get_interval(),
                z: get_interval(),
            },
        };

        for (let obj of objects.slice(start, end)) {
            bvh_node.bbox = get_aabb_bbox(
                bvh_node.bbox,
                get_aabb_points(vf.addVal(obj.center, -obj.radius), vf.addVal(obj.center, obj.radius)),
            );
        }

        const object_span = end - start;

        if (object_span === 1) {
            return {
                ...bvh_node,
                left_id: start,
                right_id: start,
            };
        }

        if (object_span === 2) {
            return {
                ...bvh_node,
                left_id: start,
                right_id: end - 1,
            };
        }

        const axis = get_longest_aabb_axis(bvh_node.bbox);

        const sortedArray = objects.slice(start, end);
        sortedArray.sort((a, b) =>
            compare_bvh_nodes(
                get_aabb_points(vf.addVal(a.center, -a.radius), vf.addVal(a.center, a.radius)),
                get_aabb_points(vf.addVal(b.center, -b.radius), vf.addVal(b.center, b.radius)),
                axis,
            ),
        );

        for (let i = start; i < end; i++) {
            objects[i] = sortedArray[i - start];
        }

        const mid = start + Math.round(object_span / 2);

        bvh_node.is_parent = true;
        bvh_node.left = get_bvh_tree(objects, start, mid);
        bvh_node.right = get_bvh_tree(objects, mid, end);

        return bvh_node;
    };

    let node_counter = 0;
    function flatten_tree(node) {
        let flattened = [];

        node_counter += 1;
        if (node.is_parent) {
            const { left, right, ...rest } = node;
            flattened.push({ ...rest, left_id: node_counter, right_id: node_counter + 1 });
            flattened = flattened.concat(flatten_tree(left));
            flattened = flattened.concat(flatten_tree(right));
        } else {
            flattened.push(node);
        }

        return flattened;
    }

    const tree = get_bvh_tree(obj_list, 0, obj_list.length);
    // console.log(tree);
    const flat_bvh = flatten_tree(tree);
    // console.log(flat_bvh);

    BVHNodes = ti.field(BVHNode, flat_bvh.length);
    for (let i = 0; i < flat_bvh.length; i++) {
        await BVHNodes.set([i], flat_bvh[i]);
    }
};

export { BVHNode, BVHNodes, init_bvh_nodes, compare_bvh_nodes };
