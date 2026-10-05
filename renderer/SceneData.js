import { OBJ_TYPE, MAT_TYPE, TEX_TYPE } from '../const.js';
import { build_bvh_from_obj } from '../classes/BVHTree.js';
import vf from '../classes/Vector.js';
import { prepare_box, get_box_bbox, box_light_quads, rotate_vector } from '../classes/Box.js';

export const object_defaults = {
    type: 0,
    boundary_type: 0,
    box_index: -1,
    uv_rotated: 0,
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
export const material_defaults = {
    type: MAT_TYPE.LAMBERTIAN,
    attenuation: [0, 0, 0],
    k: 0,
    tex: 0,
    height_tex: 0,
    height_scale: 0,
    normal_tex: 0,
    normal_scale: 1,
    emission_tex: 0,
    emission_strength: 1,
    emission_threshold: 0,
};
export const texture_defaults = {
    type: TEX_TYPE.SOLID,
    k: 1,
    color: [0, 0, 0],
    color2: [0, 0, 0],
    image_rect: [0, 0, 1, 1],
    wrap_u: 0,
    wrap_v: 0,
    color_space: 'srgb',
};
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
        return {
            ...geometry,
            type: OBJ_TYPE.MEDIUM,
            mat: object.mat ?? 0,
            boundary_type: boundary.type,
        };
    }
    const result = {
        ...object_defaults,
        ...object,
        center2: object.center2 ?? object.center ?? [0, 0, 0],
    };
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
        if (result.rotation.some((value) => value !== 0)) {
            result.uv_rotated = 1;
            result.u = rotate([1, 0, 0]);
            result.v = rotate([0, 1, 0]);
            result.normal = rotate([0, 0, 1]);
        }
        result.center = position(result.center);
        result.center2 = position(result.center2);
    }
    result.offset = [0, 0, 0];
    result.rotation = [0, 0, 0];
    return result;
};

export function prepare_scene(scene) {
    const materials = (scene.materials ?? []).map((material) => ({
        ...material_defaults,
        ...material,
    }));
    const textures = (scene.textures ?? []).map((texture) => {
        const result = { ...texture_defaults, ...texture };
        for (const key of ['wrap_u', 'wrap_v']) {
            if (texture[key] !== undefined && !['clamp', 'repeat'].includes(texture[key]))
                throw new Error('Invalid image texture wrap mode');
            result[key] = texture[key] === 'repeat' ? 1 : 0;
        }
        return result;
    });
    const boxes = [];
    const objects = scene.objects.map((object) => normalize_object(object, boxes));
    if ((scene.lights ?? []).some((light) => light.type === OBJ_TYPE.MEDIUM)) throw new Error('Unsupported light sampling geometry');
    const lights = (scene.lights ?? [])
        .flatMap((light) => (light.type === OBJ_TYPE.BOX ? box_light_quads(light) : [light]))
        .map((light) => normalize_object(light, boxes));
    for (const material of materials) {
        finite_vector(material.attenuation, 'attenuation');
        if (!Object.values(MAT_TYPE).includes(material.type) || !Number.isFinite(material.k)) throw new Error('Invalid material');
        for (const key of ['tex', 'height_tex', 'normal_tex', 'emission_tex']) {
            if (!Number.isInteger(material[key]) || material[key] < 0 || material[key] > textures.length)
                throw new Error(`Invalid material texture reference: ${key}`);
        }
        for (const key of ['height_scale', 'normal_scale', 'emission_strength', 'emission_threshold']) {
            if (!Number.isFinite(material[key]) || material[key] < 0) throw new Error(`Invalid map/emission parameter: ${key}`);
        }
        for (const key of ['height_tex', 'normal_tex']) {
            if (material[key] && textures[material[key] - 1].type !== TEX_TYPE.IMAGE)
                throw new Error('Surface maps require image textures');
        }
        if (material.normal_tex && textures[material.normal_tex - 1].color_space !== 'linear')
            throw new Error('Normal map texture must use linear color_space');
        if (material.type === MAT_TYPE.ISOTROPIC && (material.height_tex || material.normal_tex))
            throw new Error('Surface maps cannot be used with a medium/isotropic material');
        if ([MAT_TYPE.DIELECTRIC, MAT_TYPE.ISOTROPIC].includes(material.type) && material.k <= 0)
            throw new Error('Refractive index/density must be positive');
    }
    for (const texture of textures) {
        if (
            texture.type === TEX_TYPE.IMAGE &&
            (typeof texture.src !== 'string' || !texture.src.trim() || !['srgb', 'linear'].includes(texture.color_space))
        )
            throw new Error('Invalid image texture source/color_space');
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
