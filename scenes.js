import { OBJ_TYPE, MAT_TYPE, TEX_TYPE } from './const.js';
import { random_f32 } from './classes/Math.js';
import { get_box_q } from './classes/Quad.js';

import vf from './classes/Vector.js';

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_1 = {
    name: 'Test Scene',
    objects: [
        {
            type: OBJ_TYPE.SPHERE,
            center: [0.0, -100.5, -1.0],
            radius: 100.0,
            mat: 0,
        },
        ...get_box_q([0, 0, 0], [0.5, 0.5, 0.5], 4, [-0.3, 0.3, -1.0], [20, 20, 20]),
        {
            type: OBJ_TYPE.SPHERE,
            center: [-1.0, 0, -1.0],
            radius: 0.5,
            mat: 2,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [-1.0, 0.0, -1.0],
            radius: 0.4,
            mat: 3,
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [1.0, 0.0, -1.0],
            radius: 0.5,
            mat: 1,
        },
        {
            type: OBJ_TYPE.QUAD,
            Q: [-1.0, 2.0, -2.0],
            u: [2.0, 0.0, 0.0],
            v: [0.0, 0.0, 2.0],
            mat: 5,
        },
    ],
    materials: [
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.8, 0.8, 0.0],
            k: 0,
            tex: 2,
        },
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.1, 0.2, 0.5],
            k: 0,
        },
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1.0, 1.0, 1.0],
            k: 1.5,
        },
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1.0, 1.0, 1.0],
            k: 1.0 / 1.5,
        },
        {
            type: MAT_TYPE.METAL,
            attenuation: [0.8, 0.9, 0.8],
            k: 0.01,
        },
        {
            type: MAT_TYPE.LIGHT,
            attenuation: [4.2, 8.0, 4.0],
            k: 1.0,
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
        background: [10, 20, 30],
        scene: 0,
        cam_x: 0,
        cam_y: 0.5,
        cam_z: 2,
        at_x: 0.0,
        at_y: 0.0,
        at_z: -1.0,
    },
};

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_2 = {
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
                Scene_2.materials.push({
                    type: MAT_TYPE.LIGHT,
                    attenuation: [Math.random(), Math.random(), Math.random()],
                    k: 0,
                });
                Scene_2.objects.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: Scene_2.materials.length - 1,
                });
            } else if (choose_mat < 0.8) {
                // diffuse
                const albedo = [Math.random(), Math.random(), Math.random()];
                Scene_2.materials.push({
                    type: MAT_TYPE.LAMBERTIAN,
                    attenuation: albedo,
                    k: 0,
                });
                const center2 = vf.add(center, [0, random_f32(0, 0.5), 0]);
                Scene_2.objects.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    center2,
                    radius: 0.2,
                    mat: Scene_2.materials.length - 1,
                });
            } else if (choose_mat < 0.95) {
                // metal
                const albedo = [random_f32(0.5, 1), random_f32(0.5, 1), random_f32(0.5, 1)];
                const fuzz = random_f32(0, 0.5);
                Scene_2.materials.push({
                    type: MAT_TYPE.METAL,
                    attenuation: albedo,
                    k: fuzz,
                });
                Scene_2.objects.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: Scene_2.materials.length - 1,
                });
            } else {
                // glass
                Scene_2.materials.push({
                    type: MAT_TYPE.DIELECTRIC,
                    attenuation: [1, 1, 1],
                    k: 1.5,
                });
                Scene_2.objects.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: Scene_2.materials.length - 1,
                });
            }
        }
    }
}

/**
 * @type {import("./classes/Scene.js").Scene}
 */
const Scene_3 = {
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
            k: 1.0,
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
const Scene_4 = {
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

const Scene_5 = {
    name: 'Cornell Box',
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
            Q: [343, 554, 332],
            u: [-130, 0, 0],
            v: [0, 0, -105],
            mat: 3,
        },
        ...get_box_q([0, 0, 0], [165, 330, 165], 1, [265, 0, 295], [0, 15, 0]),
        ...get_box_q([0, 0, 0], [165, 165, 165], 1, [130, 0, 65], [0, -18, 0]),
    ],
    materials: [
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.65, 0.05, 0.05],
        },
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.73, 0.73, 0.73],
        },
        {
            type: MAT_TYPE.LAMBERTIAN,
            attenuation: [0.12, 0.45, 0.15],
        },
        {
            type: MAT_TYPE.LIGHT,
            attenuation: [1.0, 1.0, 1.0],
            k: 15.0,
        },
        {
            type: MAT_TYPE.DIELECTRIC,
            attenuation: [1, 1, 1],
            k: 1.5,
        },
        {
            type: MAT_TYPE.METAL,
            attenuation: [0.8, 0.85, 0.88],
            k: 0.0,
        },
    ],
    camera: {
        scene: 4,
        background: [0, 0, 0],
        spp: 200,
        vfov: 40,
        cam_x: 278,
        cam_y: 278,
        cam_z: -800,
        at_x: 278.0,
        at_y: 278.0,
        at_z: 0.0,
    },
};

const SCENE_LIST = [Scene_1, Scene_2, Scene_3, Scene_4, Scene_5];
const SCENE_SELECT = Object.fromEntries(SCENE_LIST.map((scene, key) => [scene.name, key]));

export { SCENE_LIST, SCENE_SELECT };
