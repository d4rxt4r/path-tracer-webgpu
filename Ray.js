const Ray = ti.types.struct({
   origin: ti.types.vector(ti.f32, 3),
   direction: ti.types.vector(ti.f32, 3)
});

const rayAt = (ray, t) => {
   return ray.origin + t * ray.direction;
};

export { Ray, rayAt };
