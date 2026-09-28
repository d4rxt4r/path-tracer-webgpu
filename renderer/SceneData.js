import { OBJ_TYPE, MAT_TYPE, TEX_TYPE } from '../const.js';
import { build_bvh_from_obj } from '../classes/BVHTree.js';
import vf from '../classes/Vector.js';
import { prepare_box, get_box_bbox, box_light_quads, rotate_vector } from '../classes/Box.js';

export const object_defaults = {
    type: 0,
    boundary_type: 0,
    box_index: -1,
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    mat: 0,
    Q: [0, 0, 0],
    u: [0, 0, 0],
    v: [0, 0, 0],
    normal: [0, 0, 0],
    plane_d: 0,
    quad_w: [0, 0, 0],
    area: 0,
    radius: 0,
    center: [0, 0, 0],
    center2: [0, 0, 0],
};
export const material_defaults = { type: MAT_TYPE.LAMBERTIAN, attenuation: [0, 0, 0], k: 0, tex: 0 };
export const texture_defaults = { type: TEX_TYPE.SOLID, k: 1, color: [0, 0, 0], color2: [0, 0, 0] };
export const node_defaults = {
    parent_index: -1,
    is_leaf: 1,
    right_index: -1,
    left_index: -1,
    primitive_index: -1,
    bbox: { x: { min: 0, max: 0 }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } },
};
const finite_vector = (value, label) => {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) throw new Error(`${label} must be a finite vec3`);
};
const normalize_object = (object, boxes) => {
    if (object.type === OBJ_TYPE.MEDIUM) {
        const boundary = object.boundary ?? { ...object, type: OBJ_TYPE.SPHERE };
        if (![OBJ_TYPE.SPHERE, OBJ_TYPE.BOX].includes(boundary.type)) throw new Error('Medium boundary must be a sphere or box');
        if (
            object.boundary &&
            ['offset', 'rotation'].some((key) => object[key] && (!Array.isArray(object[key]) || object[key].some((v) => v !== 0)))
        )
            throw new Error('Medium transforms must be specified on its boundary');
        const geometry = normalize_object(boundary, boxes);
        return { ...geometry, type: OBJ_TYPE.MEDIUM, mat: object.mat ?? 0, boundary_type: boundary.type };
    }
    const result = { ...object_defaults, ...object, center2: object.center2 ?? object.center ?? [0, 0, 0] };
    if (result.type === OBJ_TYPE.BOX) {
        const geometry = prepare_box(object);
        result.box_index = boxes.length;
        result.bbox = get_box_bbox(geometry);
        boxes.push(geometry);
        return result;
    }
    if (![OBJ_TYPE.SPHERE, OBJ_TYPE.QUAD].includes(result.type)) throw new Error(`Unsupported object type: ${result.type}`);
    for (const key of ['offset', 'rotation', 'center', 'center2', 'Q', 'u', 'v']) finite_vector(result[key], key);
    if (result.type === OBJ_TYPE.QUAD) {
        if (vf.length(vf.cross(result.u, result.v)) === 0) throw new Error('Quad must have nonzero area');
    } else if (!Number.isFinite(result.radius) || result.radius <= 0) throw new Error('Sphere/medium radius must be positive');
    // Apply Rz * Ry * Rx once on the CPU. All GPU geometry and light targets are world-space.
    const rotate = (vector) => rotate_vector(vector, result.rotation);
    const position = (value) => vf.add(rotate(value), result.offset);
    if (result.type === OBJ_TYPE.QUAD) {
        result.Q = position(result.Q);
        result.u = rotate(result.u);
        result.v = rotate(result.v);
        const cross = vf.cross(result.u, result.v);
        result.area = vf.length(cross);
        result.normal = vf.scale(cross, 1 / result.area);
        result.plane_d = vf.dot(result.normal, result.Q);
        result.quad_w = vf.scale(cross, 1 / vf.dot(cross, cross));
    } else {
        result.center = position(result.center);
        result.center2 = position(result.center2);
    }
    result.offset = [0, 0, 0];
    result.rotation = [0, 0, 0];
    return result;
};

export function prepare_scene(scene) {
    const materials = (scene.materials ?? []).map((material) => ({ ...material_defaults, ...material }));
    const textures = (scene.textures ?? []).map((texture) => ({ ...texture_defaults, ...texture }));
    const boxes = [];
    const objects = scene.objects.map((object) => normalize_object(object, boxes));
    if ((scene.lights ?? []).some((light) => light.type === OBJ_TYPE.MEDIUM)) throw new Error('Unsupported light sampling geometry');
    const lights = (scene.lights ?? [])
        .flatMap((light) => (light.type === OBJ_TYPE.BOX ? box_light_quads(light) : [light]))
        .map((light) => normalize_object(light, boxes));
    for (const material of materials) {
        finite_vector(material.attenuation, 'attenuation');
        if (!Object.values(MAT_TYPE).includes(material.type) || !Number.isFinite(material.k)) throw new Error('Invalid material');
        if (!Number.isInteger(material.tex) || material.tex < 0 || material.tex > textures.length)
            throw new Error('Invalid material texture reference');
        if ([MAT_TYPE.DIELECTRIC, MAT_TYPE.ISOTROPIC].includes(material.type) && material.k <= 0)
            throw new Error('Refractive index/density must be positive');
    }
    for (const texture of textures) {
        finite_vector(texture.color, 'texture color');
        finite_vector(texture.color2, 'texture color2');
        if (
            !Object.values(TEX_TYPE).includes(texture.type) ||
            !Number.isFinite(texture.k) ||
            (texture.type === TEX_TYPE.CHECKER && texture.k <= 0)
        )
            throw new Error('Invalid texture scale/type');
    }
    for (const object of objects) {
        if (!Number.isInteger(object.mat) || object.mat < 0 || object.mat >= materials.length)
            throw new Error('Invalid object material reference');
        if (object.type === OBJ_TYPE.MEDIUM && materials[object.mat].type !== MAT_TYPE.ISOTROPIC)
            throw new Error('Medium requires an isotropic material');
    }
    return {
        objects,
        boxes,
        lights,
        materials,
        textures: [{ ...texture_defaults, type: TEX_TYPE.CHECKER, color2: [1, 0, 1] }, ...textures],
        bvh: build_bvh_from_obj(objects),
        counts: [objects.length, lights.length, materials.length, textures.length],
    };
}

export function scene_capacities(scenes) {
    const max = (key) => Math.max(1, ...scenes.map((scene) => (scene[key] ?? []).length));
    const objects = max('objects');
    return {
        objects,
        lights: Math.max(
            1,
            ...scenes.map((scene) => (scene.lights ?? []).reduce((count, light) => count + (light.type === OBJ_TYPE.BOX ? 6 : 1), 0)),
        ),
        boxes: Math.max(
            1,
            ...scenes.map(
                (scene) =>
                    scene.objects.filter(
                        (object) =>
                            object.type === OBJ_TYPE.BOX || (object.type === OBJ_TYPE.MEDIUM && object.boundary?.type === OBJ_TYPE.BOX),
                    ).length,
            ),
        ),
        materials: max('materials'),
        textures: Math.max(1, ...scenes.map((s) => (s.textures ?? []).length + 1)),
        nodes: 2 * objects - 1,
    };
}
