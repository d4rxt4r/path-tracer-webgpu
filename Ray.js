const Ray = ti.types.struct({
   origin: ti.types.vector(ti.f32, 3),
   direction: ti.types.vector(ti.f32, 3)
});

const _ = (origin, direction) => {
   return {
      origin,
      direction
   };
};

const get = (i, j) => {
   const pixel_info = get00PixelLoc();
   const offset = sampleSquare();
   const pixel_sample = pixel_info[0] + (i + offset.x) * pixel_info[1] + (j + offset.y) * pixel_info[2];

   const ray_origin = CAMERA_CENTER;
   const ray_direction = pixel_sample - ray_origin;

   return { origin: ray_origin, direction: ray_direction };
};

const at = (ray, t) => {
   return ray.origin + t * ray.direction;
};

const getColor = (ray) => {
   let result = [0.0, 0.0, 0.0];
   let depth = 0;
   let hits = 0;

   let curRay = {
      origin: f32(ray.origin),
      direction: f32(ray.direction)
   };

   let int = Interval.get(0.001, 1000.0);
   let rec = {
      t: 0.0,
      p: [0.0, 0.0, 0.0],
      normal: [0.0, 0.0, 0.0],
      // mat
      scatter: false,
      attenuation: [0.0, 0.0, 0.0],
      scattered: Ray._([0.0, 0.0, 0.0], [0.0, 0.0, 0.0])
   };

   while (depth < MAX_DEPTH) {
      if (worldHit(curRay, int, rec)) {
         if (rec.scatter) {
            curRay = rec.scattered;
            if (hits) {
               result = rec.attenuation * result;
            } else {
               result = rec.attenuation;
            }
         } else {
            result = rec.attenuation;
         }

         hits += 1;
      } else {
         const unit_direction = ti.normalized(curRay.direction);
         const a = 0.5 * (unit_direction.y + 1.0);
         const bg_color = (1.0 - a) * [1.0, 1.0, 1.0] + a * [0.5, 0.7, 1.0];

         if (hits) {
            result *= bg_color;
         } else {
            result = bg_color;
         }
         break;
      }

      depth += 1;
   }

   if (hits) {
      result = result / hits;
   }

   return result;
};

export default { type: Ray, _, get, at, getColor };
