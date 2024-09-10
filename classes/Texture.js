/* global Textures */

import * as ti from '../lib/taichi.js';

import { get_record_from_struct, TEX_TYPE } from '../const.js';

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
});

const base_tex = get_record_from_struct(Texture);

const init_textures = async (tex_list = [], world_textures) => {
    await world_textures.set([0], { ...base_tex, type: TEX_TYPE.CHECKER, color: [0.0, 0.0, 0.0], color2: [1.0, 0.0, 1.0] });

    for (let i = 1; i <= tex_list.length; i++) {
        await world_textures.set([i], { ...base_tex, ...tex_list[i - 1] });
    }
};

const texture_color_value = (tex_index, u, v, p) => {
    let res = [0.0, 0.0, 0.0];
    const tex = Textures[tex_index];

    if (tex.type === TEX_TYPE.SOLID) {
        res = get_solid_texture_value(tex_index);
    }

    if (tex.type === TEX_TYPE.CHECKER) {
        res = get_checker_texture_value(tex_index, p);
    }

    return res;
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
const get_checker_texture_value = (tex_index, p) => {
    const tex = Textures[tex_index];
    const inv_scale = 1.0 / tex.k;

    const xInteger = ti.i32(ti.floor(inv_scale * p.x));
    const yInteger = ti.i32(ti.floor(inv_scale * p.y));
    const zInteger = ti.i32(ti.floor(inv_scale * p.z));

    const isEven = (xInteger + yInteger + zInteger) % 2 == 0;

    let res = tex.color2;
    if (isEven) {
        res = Textures[tex_index].color;
    }
    return res;
};

export {
    Texture,
    init_textures,
    texture_color_value,
    solid_color_texture,
    get_solid_texture_value,
    checker_texture,
    get_checker_texture_value,
};
