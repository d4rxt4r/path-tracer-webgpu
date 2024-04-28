const Sphere = ti.types.struct({
   center: ti.types.vector(ti.f32, 3),
   radius: ti.f32
});

const hit = (sphere, r, int, rec) => {
   let result = true;

   const oc = sphere.center - r.origin;
   const a = ti.normSqr(r.direction);
   const h = ti.dot(r.direction, oc);
   const c = ti.normSqr(oc) - sphere.radius * sphere.radius;
   const discriminant = h * h - a * c;

   if (discriminant < 0) {
      result = false;
   } else {
      const sqrtD = ti.sqrt(discriminant);
      let root = (h - sqrtD) / a;

      if (!Interval.surrounds(int, root)) {
         root = (h + sqrtD) / a;
         if (!Interval.surrounds(int, root)) {
            result = false;
         }
      }

      rec.t = root;
      rec.p = Ray.at(r, root);

      const outward_normal = (rec.p - sphere.center) / sphere.radius;
      Hittable.getFaceNormal(r, rec, outward_normal);
      Material.scatter(sphere, r, rec);
   }

   return result;
};

export default {
   type: Sphere,
   hit
};
