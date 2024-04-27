// Material Ids
// 0 - Lambertian
// 1 - Metal
// 2 - Dielectric

const scatter = (obj, ray, rec) => {
   let result = false;

   if (obj.mat === 0) {
      let scatter_direction = rec.normal + Random.unit_vector();

      if (Random.near_zero(scatter_direction)) {
         scatter_direction = rec.normal;
      }

      rec.scattered = Ray._(rec.p, scatter_direction);
      rec.attenuation = obj.albedo;
      rec.scatter = true;

      result = true;
   }

   if (obj.mat === 1) {
      let reflected = Random.reflect(ray.direction, rec.normal);
      rec.scattered = Ray._(rec.p, reflected);
      rec.attenuation = obj.albedo;
      rec.scatter = true;

      result = true;
   }

   return result;
};

export default { scatter };
