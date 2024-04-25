const type = ti.types.struct({
   min: ti.f32,
   max: ti.f32
});

const get = (min, max) => ({ min, max });
const size = (int) => int.max - int.min;
const contains = (int, x) => int.min <= x && x <= int.max;
const surrounds = (int, x) => int.min < x && x < int.max;
const clamp = (int, x) => {
   let res = x;
   if (x < int.min) res = int.min;
   if (x > int.max) res = int.max;
   return res;
};

export default { type, get, size, contains, surrounds, clamp };
