import * as ti from './lib/taichi.js';
import { BVHNode, build_bvh_from_obj } from './classes/BVHTree.js';
import { SCENE_LIST } from './scenes.js';

let scene_index = 0;

const main = async () => {
    await ti.init();

    let BVHTree = ti.field(BVHNode, 1000);

    const tree = build_bvh_from_obj(SCENE_LIST[scene_index].objects);
    // for (let i = 0; i < tree.length; i++) {
    //     await BVHTree.set([i], tree[i]);
    // }

    ti.addToKernelScope({
        BVHTree,
    });

    const fill_tree = ti.kernel({ tree: ti.template() }, (tree) => {
        for (let i of ti.Static(ti.range(tree.length))) {
            BVHTree[i] = tree[i];
        }
    });

    await fill_tree(tree);

    console.log(tree, await BVHTree.toArray());
};

main();

// setTimeout(() => {
//     scene_index = 1;
//     main();
// }, 1000);
