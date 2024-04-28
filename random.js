const vec3 = () => {
   return [ti.random(), ti.random(), ti.random()];
};

const vec3_2 = (min, max) => {
   let result = [0.0, 0.0, 0.0];
   for (let i of ti.static(ti.range(3))) {
      result[i] = min + (max - min) * ti.random();
   }

   return result;
};

const in_unit_sphere = () => {
   let result = Random.vec3_2(-1, 1);
   while (true) {
      if (result.normSqr() < 1) {
         break;
      }
      result = Random.vec3_2(-1, 1);
   }
   return result;
};

const unit_vector = () => normalized(Random.in_unit_sphere());

const sample_square = () => {
   return [ti.random() - 0.5, ti.random() - 0.5, 0.0];
};

const near_zero = (vec) => {
   // Return true if the vector is close to zero in all dimensions.
   const s = 1e-8;
   return ti.abs(vec.x) < s && ti.abs(vec.y) < s && ti.abs(vec.z) < s;
};

const reflect = (v, n) => {
   return v - 2 * v.dot(n) * n;
};

const refract = (uv, n, etai_over_etat) => {
   const cos_theta = ti.min(ti.dot(-uv, n), 1.0);
   const r_out_perp = etai_over_etat * (uv + cos_theta * n);
   const r_out_parallel = -ti.sqrt(ti.abs(1.0 - r_out_perp.normSqr())) * n;
   return r_out_perp + r_out_parallel;
};

const on_hemisphere = (normal) => {
   let result = Random.unit_vector();
   if (dot(result, normal) < 0.0) {
      result = -result;
   }
   return result;
};

export default {
   vec3,
   vec3_2,
   unit_vector,
   near_zero,
   reflect,
   refract,
   sample_square,
   in_unit_sphere,
   on_hemisphere
};
