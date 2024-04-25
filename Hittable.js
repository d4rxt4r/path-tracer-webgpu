const HitRec = ti.types.struct({
   p: ti.types.vector(ti.f32, 3),
   normal: ti.types.vector(ti.f32, 3),
   t: ti.f32
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

export { HitRec, getFaceNormal };
