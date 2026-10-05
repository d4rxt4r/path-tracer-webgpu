/* global Boxes, Textures */
import * as ti from '../lib/taichi.js';
import { OBJ_TYPE } from '../const.js';
import { image_texture_value } from './Texture.js';

const surface_derivatives = (object, rec, outward) => {
    let du = object.u;
    let dv = object.v;
    let valid_height = true;
    if (object.type === OBJ_TYPE.SPHERE) {
        const phi = 2.0 * Math.PI * rec.u;
        const theta = Math.PI * rec.v;
        valid_height = ti.abs(ti.sin(theta)) > 1e-4;
        du = 2.0 * Math.PI * object.radius * ti.sin(theta) * [ti.sin(phi), 0.0, ti.cos(phi)];
        dv = Math.PI * object.radius * [-ti.cos(phi) * ti.cos(theta), ti.sin(theta), ti.sin(phi) * ti.cos(theta)];
        // Longitude is undefined exactly at a pole; use a stable limiting tangent there.
        if (!valid_height) du = 1e-5 * object.radius * [ti.sin(phi), 0.0, ti.cos(phi)];
        if (object.uv_rotated === 1) {
            du = du.x * object.u + du.y * object.v + du.z * object.normal;
            dv = dv.x * object.u + dv.y * object.v + dv.z * object.normal;
        }
    } else if (object.type === OBJ_TYPE.BOX) {
        const box = Boxes[object.box_index];
        const local = [ti.dot(outward, box.axis_x), ti.dot(outward, box.axis_y), ti.dot(outward, box.axis_z)];
        du = 2.0 * box.half_size.x * box.axis_x;
        dv = 2.0 * box.half_size.y * box.axis_y;
        if (ti.abs(local.x) > 0.5) {
            du = 2.0 * box.half_size.z * box.axis_z;
            if (local.x > 0) du = -du;
        } else if (ti.abs(local.y) > 0.5) {
            dv = 2.0 * box.half_size.z * box.axis_z;
            if (local.y > 0) dv = -dv;
        } else if (local.z < 0) du = -du;
    }
    return { du, dv, valid_height };
};

const apply_surface_maps = (object, ray, rec, material) => {
    if (
        object.type !== OBJ_TYPE.MEDIUM &&
        ((material.normal_tex > 0 && material.normal_scale > 0) || (material.height_tex > 0 && material.height_scale > 0))
    ) {
        const geometric = rec.normal;
        let outward = geometric;
        if (!rec.front_face) outward = -outward;
        const frame = surface_derivatives(object, rec, outward);
        const tangent = ti.normalized(frame.du);
        const bitangent = ti.normalized(ti.cross(outward, tangent));
        let normal = outward;
        if (material.normal_tex > 0 && material.normal_scale > 0) {
            const pixel = image_texture_value(material.normal_tex, rec.u, rec.v);
            const mapped = 2.0 * [pixel.x, pixel.y, pixel.z] - 1.0;
            const candidate = material.normal_scale * (mapped.x * tangent + mapped.y * bitangent) + mapped.z * outward;
            if (ti.normSqr(candidate) > 1e-12) normal = ti.normalized(candidate);
        }
        if (material.height_tex > 0 && material.height_scale > 0) {
            const texture = Textures[material.height_tex];
            const eu = 1.0 / texture.image_rect.z;
            const ev = 1.0 / texture.image_rect.w;
            const hu =
                (image_texture_value(material.height_tex, rec.u + eu, rec.v).w -
                    image_texture_value(material.height_tex, rec.u - eu, rec.v).w) /
                (2.0 * eu);
            const hv =
                (image_texture_value(material.height_tex, rec.u, rec.v + ev).w -
                    image_texture_value(material.height_tex, rec.u, rec.v - ev).w) /
                (2.0 * ev);
            const uu = ti.dot(frame.du, frame.du);
            const uv = ti.dot(frame.du, frame.dv);
            const vv = ti.dot(frame.dv, frame.dv);
            const determinant = uu * vv - uv * uv;
            if (frame.valid_height && uu > 0 && vv > 0 && determinant > 1e-6 * uu * vv) {
                const gradient = ((vv * hu - uv * hv) * frame.du + (uu * hv - uv * hu) * frame.dv) / determinant;
                const candidate = normal - material.height_scale * gradient;
                if (ti.normSqr(candidate) > 1e-12) normal = ti.normalized(candidate);
            }
        }
        if (ti.dot(normal, outward) <= 1e-5) normal = outward;
        if (!rec.front_face) normal = -normal;
        if (ti.dot(normal, ray.direction) >= -1e-5) normal = geometric;
        rec.geometric_normal = geometric;
        rec.normal = normal;
        rec.mapped = true;
    }
};

export { surface_derivatives, apply_surface_maps };
