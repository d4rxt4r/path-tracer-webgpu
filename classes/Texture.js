import { texture_defaults } from '../renderer/SceneData.js';
import { upload_records } from '../renderer/Upload.js';
/* global Textures, ImageAtlas, image_maps_enabled */

import * as ti from '../lib/taichi.js';

import { TEX_TYPE } from '../const.js';

/**
 * @typedef TTexture
 * @property {number} type
 * @property {number} k
 * @property {import('./Vector.js').vec3} color
 * @property {import('./Vector.js').vec3} color2
 */

const Texture = ti.types.struct({
    type: ti.i32,
    k: ti.f32,
    color: ti.types.vector(ti.f32, 3),
    color2: ti.types.vector(ti.f32, 3),
    image_rect: ti.types.vector(ti.i32, 4),
    wrap_u: ti.i32,
    wrap_v: ti.i32,
});

const init_textures = async (tex_list = [], world_textures) => {
    const records = [
        { ...texture_defaults, type: TEX_TYPE.CHECKER, color2: [1.0, 0.0, 1.0] },
        ...tex_list.map((tex) => ({ ...texture_defaults, ...tex })),
    ];
    await upload_records(world_textures, records, texture_defaults);
};

const texture_color_value = (tex_index, u, v, p) => {
    let res = [0.0, 0.0, 0.0];
    const tex = Textures[tex_index];

    if (tex.type === TEX_TYPE.SOLID) {
        res = tex.color;
    }

    if (tex.type === TEX_TYPE.CHECKER) {
        res = get_checker_texture_value(tex, p);
    }
    if (ti.static(image_maps_enabled)) {
        if (tex.type === TEX_TYPE.IMAGE) {
            const pixel = image_texture_value(tex_index, u, v);
            res = [pixel.x, pixel.y, pixel.z];
        }
    }

    return res;
};

const image_texture_value = (tex_index, u, v) => {
    const tex = Textures[tex_index];
    let uv = ti.max([0.0, 0.0], ti.min([1.0, 1.0], [u, v]));
    if (tex.wrap_u === 1) uv.x = u - ti.floor(u);
    if (tex.wrap_v === 1) uv.y = v - ti.floor(v);
    const rect = tex.image_rect;
    const coords = ([rect.x, rect.y] + [uv.x, 1.0 - uv.y] * [rect.z, rect.w]) / ImageAtlas.dimensions;
    return ti.textureSampleLod(ImageAtlas, coords, 0.0);
};

const solid_color_texture = (r, g, b) => {
    return {
        type: TEX_TYPE.SOLID,
        color: [r, g, b],
    };
};
const get_solid_texture_value = (tex_index) => {
    return Textures[tex_index].color;
};

const checker_texture = (color1, color2) => {
    return {
        type: TEX_TYPE.CHECKER,
        color: color1,
        color2,
    };
};
const get_checker_texture_value = (tex, p) => {
    const inv_scale = 1.0 / tex.k;

    const xInteger = ti.i32(ti.floor(inv_scale * p.x));
    const yInteger = ti.i32(ti.floor(inv_scale * p.y));
    const zInteger = ti.i32(ti.floor(inv_scale * p.z));

    const isEven = (xInteger + yInteger + zInteger) % 2 == 0;

    let res = tex.color2;
    if (isEven) {
        res = tex.color;
    }
    return res;
};

export {
    Texture,
    init_textures,
    texture_color_value,
    image_texture_value,
    solid_color_texture,
    get_solid_texture_value,
    checker_texture,
    get_checker_texture_value,
};
