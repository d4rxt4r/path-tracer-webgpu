import { OBJ_TYPE, MAT_TYPE, TEX_TYPE } from './const.js';
import { random_f32 } from './classes/Math.js';
import { get_box_q } from './classes/Quad.js';

import vf from './classes/Vector.js';

function get_cornell_box_base() {
    return {
        objects: [
            {
                type: OBJ_TYPE.QUAD,
                Q: [555, 0, 0],
                u: [0, 555, 0],
                v: [0, 0, 555],
                mat: 2,
            },
            {
                type: OBJ_TYPE.QUAD,
                Q: [0, 0, 0],
                u: [0, 555, 0],
                v: [0, 0, 555],
                mat: 0,
            },
            {
                type: OBJ_TYPE.QUAD,
                Q: [0, 0, 0],
                u: [555, 0, 0],
                v: [0, 0, 555],
                mat: 1,
            },
            {
                type: OBJ_TYPE.QUAD,
                Q: [555, 555, 555],
                u: [-555, 0, 0],
                v: [0, 0, -555],
                mat: 1,
            },
            {
                type: OBJ_TYPE.QUAD,
                Q: [0, 0, 555],
                u: [555, 0, 0],
                v: [0, 555, 0],
                mat: 1,
            },
            {
                type: OBJ_TYPE.QUAD,
                Q: [213, 554, 227],
                u: [130, 0, 0],
                v: [0, 0, 105],
                mat: 3,
            },
        ],
        lights: [
            {
                type: OBJ_TYPE.QUAD,
                Q: [213, 554, 227],
                u: [130, 0, 0],
                v: [0, 0, 105],
                mat: 0,
            },
        ],
        materials: [
            // red
            {
                type: MAT_TYPE.LAMBERTIAN,
                attenuation: [0.65, 0.05, 0.05],
            },
            // white
            {
                type: MAT_TYPE.LAMBERTIAN,
                attenuation: [0.73, 0.73, 0.73],
            },
            // green
            {
                type: MAT_TYPE.LAMBERTIAN,
                attenuation: [0.12, 0.45, 0.15],
            },
            // light
            {
                type: MAT_TYPE.LIGHT,
                attenuation: [15.0, 15.0, 15.0],
                k: 1.0,
            },
        ],
        camera: {
            scene: 0,
            background: [0, 0, 0],
            spp: 200,
            vfov: 40,
            cam_x: 278,
            cam_y: 278,
            cam_z: -800,
            at_x: 278,
            at_y: 278,
            at_z: 0,
        },
    };
}

const CornellBoxBase = get_cornell_box_base();

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_0 = {
    name: 'Test Scene',
    objects: [
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, -100.5, -1.0],
            radius: 100.0,
            mat: 0,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [-1.0, 0, -1.0],
            radius: 0.5,
            mat: 1,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [1.0, 0.0, -1.0],
            radius: 0.5,
            mat: 2,
        },
        {
            type: OBJ_TYPE.QUAD,
            Q: [-1.0, 3.0, -2.0],
            u: [2.0, 0.0, 0.0],
            v: [0.0, 0.0, 2.0],
            mat: 6,
        },
        ...get_box_q([0.1, 0.1, 0.1], [0.4, 0.4, 0.4], 5, [-0.3, 0.1, -1.0], [45, 45, 45]),
    ],
    lights: [
        {
            type: OBJ_TYPE.QUAD,
            Q: [-1.0, 3.0, -2.0],
            u: [2.0, 0.0, 0.0],
            v: [0.0, 0.0, 2.0],
        },
    ],
    materials: [
        // checkerboard - 0
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.8, 0.8, 0.0],
            tex: 2,
        },
        // lambertian diffuse tex - 1
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.9, 0.9, 0.9],
            tex: 1,
        },
        // lambertian diffuse - 2
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.9, 0.9, 0.9],
        },
        // glass - 3
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1.0, 1.0, 1.0],
            k: 1.5,
        },
        // air - 4
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1.0, 1.0, 1.0],
            k: 1 / 1.5,
        },
        // mirror - 5
        {
            type: MAT_TYPE.METAL,
            attenuation: [0.8, 0.9, 0.8],
            k: 0.01,
        },
        // light - 6
        {
            type: MAT_TYPE.LIGHT,
            attenuation: [0.8, 0.8, 0.4],
            k: 4.0,
        },
        // constant density - 7
        {
            type: MAT_TYPE.ISOTROPIC,
            attenuation: [0.0, 1.0, 0.0],
            k: 0.08,
        },
    ],
    textures: [
        {
            type: TEX_TYPE.SOLID,
            color: [0.4, 0.8, 0.0],
        },
        {
            type: TEX_TYPE.CHECKER,
            k: 0.32,
            color: [0.2, 0.3, 0.1],
            color2: [0.9, 0.9, 0.9],
        },
    ],
    camera: {
        background: [10, 10, 10],
        scene: 0,
        cam_x: 0,
        cam_y: 0.5,
        cam_z: 2,
        at_x: 0.0,
        at_y: 0.0,
        at_z: -2.0,
        max_depth: 10,
        spp: 50,
    },
};

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_1 = {
    name: 'Bouncing Spheres',
    objects: [
        {
            type: OBJ_TYPE.SPHERE,
            center: [0, -1000.0, 0],
            radius: 1000.0,
            mat: 0,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [0, 1, 0],
            radius: 1.0,
            mat: 1,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [-4, 1, 0],
            radius: 1.0,
            mat: 2,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [4, 1, 0],
            radius: 1.0,
            mat: 3,
        },
    ],
    lights: [
        {
            type: OBJ_TYPE.QUAD,
            Q: [0, 0, 0],
            v: [1, 0, 0],
            u: [0, 0, 1],
        },
    ],
    materials: [
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.5, 0.5, 0.5],
            k: 0,
            tex: 1,
        },
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1, 1, 1],
            k: 1.5,
        },
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.4, 0.2, 0.1],
            k: 0,
        },
        {
            type: MAT_TYPE.METAL,
            attenuation: [0.7, 0.6, 0.5],
            k: 0,
        },
    ],
    textures: [
        {
            type: TEX_TYPE.CHECKER,
            k: 0.32,
            color: [0.2, 0.3, 0.1],
            color2: [0.9, 0.9, 0.9],
        },
    ],
    camera: {
        background: [0.7 * 255, 0.8 * 255, 255],
        scene: 1,
        cam_x: 13,
        cam_y: 2,
        cam_z: 3,
        at_x: 0.0,
        at_y: 0.0,
        at_z: 0.0,
        max_depth: 50,
        spp: 50,
        vfov: 20,
        defocus_angle: 0.6,
        focus_dist: 10.0,
    },
};

for (let a = -11; a < 11; a++) {
    for (let b = -11; b < 11; b++) {
        const choose_mat = Math.random();
        const center = [a + 0.9 * Math.random(), 0.2, b + 0.9 * Math.random()];

        if (vf.length(vf.sub(center, [4, 0.2, 0])) > 0.9) {
            if (choose_mat < 0.3) {
                // lights
                Scene_1.materials.push({
                    type: MAT_TYPE.LIGHT,
                    attenuation: [Math.random(), Math.random(), Math.random()],
                    k: 0,
                });
                Scene_1.objects.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: Scene_1.materials.length - 1,
                });
            } else if (choose_mat < 0.8) {
                // diffuse
                const albedo = [Math.random(), Math.random(), Math.random()];
                Scene_1.materials.push({
                    type: MAT_TYPE.LAMBERTIAN,
                    attenuation: albedo,
                    k: 0,
                });
                const center2 = vf.add(center, [0, random_f32(0, 0.5), 0]);
                Scene_1.objects.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    center2,
                    radius: 0.2,
                    mat: Scene_1.materials.length - 1,
                });
            } else if (choose_mat < 0.95) {
                // metal
                const albedo = [random_f32(0.5, 1), random_f32(0.5, 1), random_f32(0.5, 1)];
                const fuzz = random_f32(0, 0.5);
                Scene_1.materials.push({
                    type: MAT_TYPE.METAL,
                    attenuation: albedo,
                    k: fuzz,
                });
                Scene_1.objects.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: Scene_1.materials.length - 1,
                });
            } else {
                // glass
                Scene_1.materials.push({
                    type: MAT_TYPE.DIELECTRIC,
                    attenuation: [1, 1, 1],
                    k: 1.5,
                });
                Scene_1.objects.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: Scene_1.materials.length - 1,
                });
            }
        }
    }
}

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_2 = {
    name: 'Perlin Noise (WIP)',
    objects: [
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, -1000.0, 0.0],
            radius: 1000.0,
            mat: 0,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, 2.0, 0.0],
            radius: 2.0,
            mat: 1,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, 2.0, 0.0],
            radius: 1.0,
            mat: 2,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, 2.0, 0.0],
            radius: 0.2,
            mat: 3,
        },
    ],
    lights: [
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, 2.0, 0.0],
            radius: 2.0,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, 2.0, 0.0],
            radius: 1.0,
            mat: 2,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, 2.0, 0.0],
            radius: 0.2,
        },
    ],
    materials: [
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.8, 0.9, 0.8],
            tex: 1,
        },
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1.0, 1.0, 1.0],
            k: 1.4,
        },
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1.0, 1.0, 1.0],
            k: 1 / 1.4,
        },
        {
            type: MAT_TYPE.LIGHT,
            attenuation: [1.0, 1.0, 1.0],
            k: 5.0,
        },
    ],
    textures: [
        {
            type: TEX_TYPE.CHECKER,
            k: 0.32,
            color: [0.0, 0.0, 0.0],
            color2: [1.0, 0.0, 0.9],
        },
    ],
    camera: {
        scene: 2,
        cam_x: 13,
        cam_y: 2,
        cam_z: 3,
        at_x: 0,
        at_y: 1,
        at_z: 0,
    },
};

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_3 = {
    name: 'Quads Test',
    objects: [
        {
            type: OBJ_TYPE.QUAD,
            Q: [-3, -2, 5],
            u: [0, 0, -4],
            v: [0, 4, 0],
            mat: 0,
        },
        {
            type: OBJ_TYPE.QUAD,
            Q: [-2, -2, 0],
            u: [4, 0, 0],
            v: [0, 4, 0],
            mat: 1,
        },
        {
            type: OBJ_TYPE.QUAD,
            Q: [3, -2, 1],
            u: [0, 0, 4],
            v: [0, 4, 0],
            mat: 2,
        },
        {
            type: OBJ_TYPE.QUAD,
            Q: [-2, 3, 1],
            u: [4, 0, 0],
            v: [0, 0, 4],
            mat: 3,
        },
        {
            type: OBJ_TYPE.QUAD,
            Q: [-2, -3, 5],
            u: [4, 0, 0],
            v: [0, 0, -4],
            mat: 4,
        },
    ],
    lights: [
        {
            type: OBJ_TYPE.QUAD,
            Q: [-6, 0, 1],
            u: [10, 0, 0],
            v: [0, 0, 6],
        },
    ],
    materials: [
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [1.0, 0.2, 0.2],
        },
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.2, 1.0, 0.2],
        },
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.2, 0.2, 1.0],
        },
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [1.0, 0.5, 0.0],
        },
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.2, 0.8, 0.8],
        },
    ],
    camera: {
        scene: 3,
        vfov: 80,
        cam_x: 0,
        cam_y: 0,
        cam_z: 9,
        at_x: 0.0,
        at_y: 0.0,
        at_z: 0.0,
    },
};

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_4 = {
    ...CornellBoxBase,
    name: 'Cornell Box',
    objects: [
        ...CornellBoxBase.objects,
        ...get_box_q([0, 0, 0], [165, 330, 165], 1, [265, 0, 295], [0, 15, 0]),
        ...get_box_q([0, 0, 0], [165, 165, 165], 1, [130, 0, 65], [0, -18, 0]),
    ],
    camera: {
        ...CornellBoxBase.camera,
        scene: 4,
    },
};

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_5 = {
    ...CornellBoxBase,
    name: 'Cornell Box (Mirror Test)',
    objects: [
        ...CornellBoxBase.objects,
        ...get_box_q([0, 0, 0], [165, 330, 165], 4, [265, 0, 295], [0, 15, 0]),
        ...get_box_q([0, 0, 0], [165, 165, 165], 1, [130, 0, 65], [0, -18, 0]),
    ],
    materials: [
        ...CornellBoxBase.materials,
        // mirror
        {
            type: MAT_TYPE.METAL,
            attenuation: [0.8, 0.85, 0.88],
            k: 0.0,
        },
    ],
    camera: {
        ...CornellBoxBase.camera,
        scene: 5,
    },
};

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_6 = {
    ...CornellBoxBase,
    name: 'Cornell Box (Glass Test)',
    objects: [
        ...CornellBoxBase.objects,
        ...get_box_q([0, 0, 0], [165, 330, 165], 1, [265, 0, 295], [0, 15, 0]),
        {
            type: OBJ_TYPE.SPHERE,
            center: [190, 90, 190],
            radius: 90,
            mat: 4,
        },
    ],
    lights: [
        ...CornellBoxBase.lights,
        {
            type: OBJ_TYPE.SPHERE,
            center: [190, 90, 190],
            radius: 90,
        },
    ],
    materials: [
        ...CornellBoxBase.materials,
        // glass
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1, 1, 1],
            k: 1.5,
        },
    ],
    camera: {
        ...CornellBoxBase.camera,
        scene: 6,
    },
};

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_7 = {
    ...CornellBoxBase,
    name: 'Cornell Box (Stress Test)',
    objects: [
        ...CornellBoxBase.objects,
        {
            type: OBJ_TYPE.SPHERE,
            center: [400, 277.5, 277.5],
            radius: 120,
            mat: 4,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [400, 277.5, 277.5],
            radius: 119.5,
            mat: 5,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [140, 90, 400],
            radius: 90,
            mat: 6,
        },
        {
            type: OBJ_TYPE.QUAD,
            Q: [3, 25, 140],
            u: [0, 200, 0],
            v: [0, 0, 260],
            mat: 6,
        },
    ],
    lights: [
        ...CornellBoxBase.lights,
        {
            type: OBJ_TYPE.SPHERE,
            center: [400, 277.5, 277.5],
            radius: 120,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [400, 277.5, 277.5],
            radius: 119.5,
        },
    ],
    materials: [
        ...CornellBoxBase.materials,
        // 4 - glass
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1, 1, 1],
            k: 1.5,
        },
        // 5 - air
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1, 1, 1],
            k: 1 / 1.5,
        },
        // 6 - mirror
        {
            type: MAT_TYPE.METAL,
            attenuation: [0.8, 0.85, 0.88],
            k: 0.0,
        },
    ],
    camera: {
        ...CornellBoxBase.camera,
        scene: 7,
    },
};

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_8 = {
    ...CornellBoxBase,
    name: 'Cornell Box (Fog Test)',
    objects: [
        ...CornellBoxBase.objects,
        {
            type: OBJ_TYPE.MEDIUM,
            center: [400, 277.5, 277.5],
            radius: 120,
            mat: 4,
        },
        {
            type: OBJ_TYPE.MEDIUM,
            center: [140, 90, 400],
            radius: 90,
            mat: 5,
        },
        // ...get_box_q([0, 0, 0], [165, 330, 165], 4, [265, 0, 295], [0, 15, 0], OBJ_TYPE.MEDIUM),
        // ...get_box_q([0, 0, 0], [165, 165, 165], 5, [130, 0, 65], [0, -18, 0], OBJ_TYPE.MEDIUM),
    ],
    lights: CornellBoxBase.lights,
    materials: [
        ...CornellBoxBase.materials,
        // black smoke - 4
        {
            type: MAT_TYPE.ISOTROPIC,
            attenuation: [0.0, 0.0, 0.0],
            k: 0.0001,
        },
        // white smoke - 5
        {
            type: MAT_TYPE.ISOTROPIC,
            attenuation: [1.0, 1.0, 1.0],
            k: 0.001,
        },
    ],
    camera: {
        ...CornellBoxBase.camera,
        scene: 8,
    },
};

const SCENE_LIST = [Scene_0, Scene_1, Scene_2, Scene_3, Scene_4, Scene_5, Scene_6, Scene_7, Scene_8];
const SCENE_SELECT = Object.fromEntries(SCENE_LIST.map((scene, key) => [scene.name, key]));

export { SCENE_LIST, SCENE_SELECT };
