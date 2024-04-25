const Ray = ti.types.struct({
   origin: ti.types.vector(ti.f32, 3),
   direction: ti.types.vector(ti.f32, 3)
});

const get = (i, j, rnd) => {
   const pixel_info = get00PixelLoc();
   const offset = sampleSquare(i, j, rnd);
   const pixel_sample = pixel_info[0] + (i + offset.x) * pixel_info[1] + (j + offset.y) * pixel_info[2];

   const ray_origin = CAMERA_CENTER;
   const ray_direction = pixel_sample - ray_origin;

   return { origin: ray_origin, direction: ray_direction };
};

const at = (ray, t) => {
   return ray.origin + t * ray.direction;
};

const getColor = (ray) => {
   let int = Interval.get(0.0, 10000.0);
   let rec = {
      t: 0.0,
      p: [0.0, 0.0, 0.0],
      normal: [0.0, 0.0, 0.0]
   };
   let result = [0.0, 0.0, 0.0];

   if (worldHit(ray, int, rec)) {
      result = 0.5 * (rec.normal + [1, 1, 1]);
   } else {
      const unit_direction = ti.normalized(ray.direction);
      const a = 0.5 * (unit_direction.y + 1.0);
      result = (1.0 - a) * [1.0, 1.0, 1.0] + a * [0.5, 0.7, 1.0];
   }

   return result;
};

export default { type: Ray, get, at, getColor };
