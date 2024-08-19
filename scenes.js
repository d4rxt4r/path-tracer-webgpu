import { OBJ_TYPE, MAT_TYPE } from "./const.js";
import { random } from './classes/Math.js';
import VectorFactory from "./classes/Vector.js";

const vf = new VectorFactory();

const scene_1 = [
    {
        type: OBJ_TYPE.SPHERE,
        center: [0.0, -100.5, -1.0],
        radius: 100.0,
        mat: 0,
    },
    {
        type: OBJ_TYPE.SPHERE,
        center: [0.0, 0.0, -1.2],
        radius: 0.5,
        mat: 1,
    },
    {
        type: OBJ_TYPE.SPHERE,
        center: [-1.0, 0.0, -1.0],
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
        mat: 4,
    },
]

const scene_1_mat = [
    {
        type: MAT_TYPE.LAMBERTIAN,
        attenuation: [0.8, 0.8, 0.0],
        k: 0,
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
        attenuation: [0.8, 0.6, 0.2],
        k: 1.0,
    }
]

const scene_2 = [
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
];

const scene_2_mat = [
    {
        type: MAT_TYPE.LAMBERTIAN,
        attenuation: [0.5, 0.5, 0.5],
        k: 0,
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
]

for (let a = -11; a < 11; a++) {
    for (let b = -11; b < 11; b++) {
        const choose_mat = Math.random();
        const center = [a + 0.9 * Math.random(), 0.2, b + 0.9 * Math.random()];

        if (vf.length(vf.sub(center, [4, 0.2, 0])) > 0.9) {
            if (choose_mat < 0.8) {
                // diffuse
                const albedo = [Math.random(), Math.random(), Math.random()];
                scene_2_mat.push({
                    type: MAT_TYPE.LAMBERTIAN,
                    attenuation: albedo,
                    k: 0,
                });
                scene_2.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: scene_2_mat.length - 1,
                });
            } else if (choose_mat < 0.95) {
                // metal
                const albedo = [random(0.5, 1), random(0.5, 1), random(0.5, 1)];
                const fuzz = random(0, 0.5);
                scene_2_mat.push({
                    type: MAT_TYPE.METAL,
                    attenuation: albedo,
                    k: fuzz,
                });
                scene_2.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: scene_2_mat.length - 1,
                });
            } else {
                // glass
                scene_2_mat.push({
                    type: MAT_TYPE.DIELECTRIC,
                    attenuation: [1, 1, 1],
                    k: 1.5,
                });
                scene_2.push({
                    type: OBJ_TYPE.SPHERE,
                    center,
                    radius: 0.2,
                    mat: scene_2_mat.length - 1,
                });
            }
        }
    }
}

export {
    scene_1,
    scene_1_mat,
    scene_2,
    scene_2_mat,
}