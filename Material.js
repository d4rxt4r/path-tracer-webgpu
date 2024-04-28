// Material Ids
// 0 - Lambertian
// 1 - Metal
// 2 - Dielectric

// Material Props
// Metal
// 0 - Fuzz
// Dielectric
// 0 - Refraction Index

const reflectance = (cosine, ri) => {
   // Use Schlick's approximation for reflectance.
   let r0 = (1 - ri) / (1 + ri);
   r0 = r0 * r0;
   return r0 + (1 - r0) * ti.pow(1 - cosine, 5);
};

const scatter = (obj, ray, rec) => {
   let result = false;

   // Lambertian
   if (obj.mat === 0) {
      let scatter_direction = rec.normal + Random.unit_vector();

      if (Random.near_zero(scatter_direction)) {
         scatter_direction = rec.normal;
      }

      rec.scattered = Ray._(rec.p, scatter_direction);
      rec.attenuation = obj.albedo;

      result = true;
   }

   // Metal
   if (obj.mat === 1) {
      let reflected = Random.reflect(ray.direction, rec.normal);
      reflected = normalized(reflected) + obj.mat_props[0] * Random.unit_vector();

      rec.scattered = Ray._(rec.p, reflected);
      rec.attenuation = obj.albedo;

      result = ti.dot(rec.scattered.direction, rec.normal) > 0;
   }

   // Dielectric
   if (obj.mat === 2) {
      let ri = ti.f32(obj.mat_props[0]);
      if (rec.front_face) {
         ri = 1.0 / obj.mat_props[0];
      }

      const unit_direction = ti.normalized(ray.direction);
      const cos_theta = ti.min(ti.dot(-unit_direction, rec.normal), 1.0);
      const sin_theta = ti.sqrt(1.0 - cos_theta * cos_theta);
      const cannot_refract = ri * sin_theta > 1.0;

      let direction = Random.refract(unit_direction, rec.normal, ri);
      if (cannot_refract || Material.reflectance(cos_theta, ri) > ti.random()) {
         direction = Random.reflect(unit_direction, rec.normal);
      }

      rec.scattered = Ray._(rec.p, direction);
      rec.attenuation = [1, 1, 1];

      result = true;
   }

   rec.scatter = result;
   return result;
};

export default { scatter, reflectance };
