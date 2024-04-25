import { rayAt } from './Ray.js';

const HitRec = ti.types.struct({
   p: ti.types.vector(ti.f32, 3),
   normal: ti.types.vector(ti.f32, 3),
   t: ti.f32
});

const Sphere = ti.types.struct({
   center: ti.types.vector(ti.f32, 3),
   radius: ti.f32
});

const getFaceNormal = (r, outwardNormal) => {
   let result = [0.0, 0.0, 0.0];
   const frontFace = dot(r.direction, outwardNormal) < 0;
   if (frontFace) {
      result = outwardNormal;
   } else {
      result = -outwardNormal;
   }

   return result;
};

const hitSphere = (center, radius, r, tMin, tMax, rec) => {
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

      if (root <= tMin || tMax <= root) {
         root = (h + sqrtD) / a;
         if (root <= tMin || tMax <= root) {
            result = false;
         }
      }

      rec.t = root;
      rec.p = rayAt(r, root);
      rec.normal = getFaceNormal(r, (rec.p - center) / radius);
   }

   return result;
};

export { HitRec, Sphere, getFaceNormal, hitSphere };
