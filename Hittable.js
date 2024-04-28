const HitRec = ti.types.struct({
   p: ti.types.vector(ti.f32, 3),
   normal: ti.types.vector(ti.f32, 3),
   t: ti.f32
});

const getFaceNormal = (r, rec, outwardNormal) => {
   rec.front_face = dot(r.direction, outwardNormal) < 0;

   if (rec.front_face) {
      rec.normal = outwardNormal;
   } else {
      rec.normal = -outwardNormal;
   }
};

export default { type: HitRec, getFaceNormal };
