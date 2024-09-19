const EPS = 1e-8;
const MAX_F32 = 2147483647;

const OBJ_TYPE = {
    SPHERE: 1,
    QUAD: 2,
    MEDIUM: 3,
    BOX: 4,
};

const MAT_TYPE = {
    LAMBERTIAN: 1,
    METAL: 2,
    DIELECTRIC: 3,
    LIGHT: 4,
    ISOTROPIC: 5,
};

const TEX_TYPE = {
    SOLID: 1,
    CHECKER: 2,
};

const get_record_from_struct = (struct) => {
    const mat_types = struct.memberTypes_;
    const base_obj = {};
    mat_types.forEach((type, key) => {
        if (type.primitiveType_ === 'i32') {
            base_obj[key] = type.numRows_ ? [0, 0, 0] : -1;
        } else {
            base_obj[key] = type.numRows_ ? [0.0, 0.0, 0.0] : 0.0;
        }
    });
    return base_obj;
};

export { EPS, MAX_F32, OBJ_TYPE, MAT_TYPE, TEX_TYPE, get_record_from_struct };
