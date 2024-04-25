const Sphere = ti.types.struct({
   center: ti.types.vector(ti.f32, 3),
   radius: ti.f32
});

const hit = (center, radius, r, int, rec) => {
   let result = true;

   const oc = center - r.origin;
   const a = ti.normSqr(r.direction);
   const h = ti.dot(r.direction, oc);
   const c = ti.normSqr(oc) - radius * radius;
   const discriminant = h * h - a * c;

   if (discriminant < 0) {
      result = false;
   } else {
      const sqrtD = sqrt(discriminant);
      let root = (h - sqrtD) / a;

      if (!Interval.surrounds(int, root)) {
         root = (h + sqrtD) / a;
         if (!Interval.surrounds(int, root)) {
            result = false;
         }
      }

      rec.t = root;
      rec.p = Ray.at(r, root);
      rec.normal = getFaceNormal(r, (rec.p - center) / radius);
   }

   return result;
};

export default {
   type: Sphere,
   hit
};
