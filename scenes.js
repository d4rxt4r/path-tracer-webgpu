import { OBJ_TYPE, MAT_TYPE, TEX_TYPE } from './const.js';
import { random_f32 } from './classes/Math.js';

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
            mat: 3,
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
        { type: OBJ_TYPE.BOX, min: [0.1, 0.1, 0.1], max: [0.4, 0.4, 0.4], mat: 8, offset: [-0.3, 0.1, -1.0], rotation: [45, 40, 30] },
    ],
    lights: [
        {
            type: OBJ_TYPE.QUAD,
            Q: [-1.0, 3.0, -2.0],
            u: [2.0, 0.0, 0.0],
            v: [0.0, 0.0, 2.0],
        },
        {
            type: OBJ_TYPE.SPHERE,
            center: [-1.0, 0, -1.0],
            radius: 0.5,
            mat: 3,
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
            attenuation: [0.1, 1.0, 0.2],
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
        // metal - 8
        {
            type: MAT_TYPE.METAL,
            attenuation: [0.7, 0.22, 0.5],
            k: 0.23,
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
        { type: OBJ_TYPE.BOX, min: [0, 0, 0], max: [165, 330, 165], mat: 1, offset: [265, 0, 295], rotation: [0, 15, 0] },
        { type: OBJ_TYPE.BOX, min: [0, 0, 0], max: [165, 165, 165], mat: 1, offset: [130, 0, 65], rotation: [0, -18, 0] },
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
        { type: OBJ_TYPE.BOX, min: [0, 0, 0], max: [165, 330, 165], mat: 4, offset: [265, 0, 295], rotation: [0, 15, 0] },
        { type: OBJ_TYPE.BOX, min: [0, 0, 0], max: [165, 165, 165], mat: 1, offset: [130, 0, 65], rotation: [0, -18, 0] },
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
        { type: OBJ_TYPE.BOX, min: [0, 0, 0], max: [165, 330, 165], mat: 1, offset: [265, 0, 295], rotation: [0, 15, 0] },
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
            boundary: { type: OBJ_TYPE.SPHERE, center: [400, 277.5, 277.5], radius: 120 },
            mat: 4,
        },
        // {
        //     type: OBJ_TYPE.MEDIUM,
        //     center: [140, 90, 400],
        //     radius: 90,
        //     mat: 5,
        // },
        {
            type: OBJ_TYPE.MEDIUM,
            mat: 5,
            boundary: { type: OBJ_TYPE.BOX, min: [0, 0, 0], max: [165, 165, 165], offset: [130, 0, 65], rotation: [0, -18, 0] },
        },
    ],
    lights: CornellBoxBase.lights,
    materials: [
        ...CornellBoxBase.materials,
        // black smoke - 4
        {
            type: MAT_TYPE.ISOTROPIC,
            attenuation: [0.0, 0.0, 0.0],
            k: 0.01,
        },
        // white smoke - 5
        {
            type: MAT_TYPE.ISOTROPIC,
            attenuation: [1.0, 1.0, 1.0],
            k: 0.01,
        },
    ],
    camera: {
        ...CornellBoxBase.camera,
        scene: 8,
    },
};

const EarthStars = Array.from({ length: 80 }, (_, index) => {
    const noise = (offset) => {
        const value = Math.sin((index + 1) * 127.1 + offset * 311.7) * 43758.5453;
        return value - Math.floor(value);
    };
    return {
        type: OBJ_TYPE.SPHERE,
        center: [-80, -4.8 + (2 * noise(1) - 1) * 27, (2 * noise(2) - 1) * 47],
        radius: 0.06 + 0.12 * noise(3),
        mat: 5 + (index % 3),
    };
});

const Earth = {
    name: 'Earth-mapped sphere',
    objects: [
        { type: OBJ_TYPE.SPHERE, center: [0, 0, 0], radius: 1, mat: 0 },
        { type: OBJ_TYPE.SPHERE, center: [-18, 3, 5.8], radius: 1.2, mat: 1 },
        { type: OBJ_TYPE.SPHERE, center: [-4, 1.4, -3], radius: 0.42, mat: 2 },
        // Soft lights sit outside the camera view; the distant Sun provides the backdrop.
        { type: OBJ_TYPE.QUAD, Q: [4, 2, 2], u: [0, 0, 4], v: [0, 4, 0], mat: 3 },
        { type: OBJ_TYPE.QUAD, Q: [2, -3, -5], u: [0, 0, 3], v: [0, 2, 0], mat: 4 },
        ...EarthStars,
    ],
    lights: [
        { type: OBJ_TYPE.QUAD, Q: [4, 2, 2], u: [0, 0, 4], v: [0, 4, 0] },
        { type: OBJ_TYPE.QUAD, Q: [2, -3, -5], u: [0, 0, 3], v: [0, 2, 0] },
    ],
    textures: [
        {
            type: TEX_TYPE.IMAGE,
            src: 'res/earth/2k_earth_nightmap.jpg',
            wrap_u: 'repeat',
        },
        {
            type: TEX_TYPE.IMAGE,
            src: 'res/earth/2k_earth_normal_map.tif',
            color_space: 'linear',
            wrap_u: 'repeat',
        },
        {
            type: TEX_TYPE.IMAGE,
            src: 'res/earth/2k_earth_daymap.jpg',
            wrap_u: 'repeat',
        },
        {
            type: TEX_TYPE.IMAGE,
            src: 'res/moon/lroc_color_poles_1k.jpg',
            wrap_u: 'repeat',
        },
    ],
    materials: [
        {
            type: MAT_TYPE.LAMBERTIAN,
            tex: 3,
            normal_tex: 2,
            normal_scale: 1.2,
            emission_tex: 1,
            emission_strength: 0.75,
            emission_threshold: 0.007,
        },
        { type: MAT_TYPE.LIGHT, attenuation: [1, 0.7, 0.18], k: 4 },
        { type: MAT_TYPE.LAMBERTIAN, tex: 4 },
        { type: MAT_TYPE.LIGHT, attenuation: [1, 0.96, 0.84], k: 14 },
        { type: MAT_TYPE.LIGHT, attenuation: [0.42, 0.62, 1], k: 3 },
        { type: MAT_TYPE.LIGHT, attenuation: [1, 0.83, 0.58], k: 1.4 },
        { type: MAT_TYPE.LIGHT, attenuation: [0.55, 0.72, 1], k: 1.4 },
        { type: MAT_TYPE.LIGHT, attenuation: [0.6, 0.65, 0.7], k: 0.6 },
    ],
    camera: {
        scene: 9,
        cam_x: 5.8,
        cam_y: 0.35,
        cam_z: 0,
        at_x: 0,
        at_y: 0,
        at_z: 0,
        background: [0, 0, 0],
        vfov: 34,
        defocus_angle: 0,
        focus_dist: 5.8,
        spp: 500,
        max_depth: 8,
        lights_pdf_weight: 0.5,
    },
};

const SCENE_LIST = [Scene_0, Scene_1, Scene_2, Scene_3, Scene_4, Scene_5, Scene_6, Scene_7, Scene_8, Earth];
const SCENE_SELECT = Object.fromEntries(SCENE_LIST.map((scene, key) => [scene.name, key]));

export { SCENE_LIST, SCENE_SELECT };
