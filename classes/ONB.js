import * as ti from '../lib/taichi.js';

const new_onb = (n) => {
    const w = ti.normalized(n);
    let a = [1.0, 0.0, 0.0];
    if (ti.abs(w.x) > 0.9) {
        a = [0.0, 1.0, 0.0];
    }
    const v = ti.normalized(ti.cross(w, a));
    const u = ti.cross(w, v);
    return {
        u,
        v,
        w,
    };
};

const transform_onb = (onb, v) => {
    // Transform from basis coordinates to local space.
    return v.x * onb.u + v.y * onb.v + v.z * onb.w;
};

export { new_onb, transform_onb };
