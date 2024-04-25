import * as ti from './lib/taichi.dev.js';

import Interval from './Interval.js';
import Sphere from './Sphere.js';
import Ray from './Ray.js';
import Random from './random.js';

await ti.init();

const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 512;
const CAMERA_CENTER = [0, 0, 0];
const SAMPLES_PER_PIXEL = 1;

const htmlCanvas = document.getElementById('canvas');
htmlCanvas.width = IMAGE_WIDTH;
htmlCanvas.height = IMAGE_HEIGHT;

const renderTarget = ti.canvasTexture(htmlCanvas);
const vertices = ti.field(ti.types.vector(ti.f32, 2), [6]);
await vertices.fromArray([
   [-1, -1],
   [1, -1],
   [-1, 1],
   [1, -1],
   [1, 1],
   [-1, 1]
]);

// Types:
// 1 - sphere
const World = [
   {
      type: 1,
      center: [0, 0, -1],
      radius: 0.5
   },
   {
      type: 1,
      center: [0, -100.5, -1],
      radius: 100
   }
];

const pixels = ti.field(ti.f32, [IMAGE_WIDTH, IMAGE_HEIGHT]);

ti.addToKernelScope({
   IMAGE_WIDTH,
   IMAGE_HEIGHT,
   CAMERA_CENTER,
   World,
   WorldLen: World.length,
   spp: SAMPLES_PER_PIXEL,
   pixels,
   vertices,
   renderTarget,
   Random,
   Ray,
   Interval,
   Sphere
});

const get00PixelLoc = () => {
   const focal_length = 1.0;
   const viewport_height = 2.0;
   const viewport_width = viewport_height * (IMAGE_WIDTH / IMAGE_HEIGHT);
   const viewport_u = [viewport_width, 0, 0];
   const viewport_v = [0, viewport_height, 0];

   const pixel_delta_u = viewport_u / IMAGE_WIDTH;
   const pixel_delta_v = viewport_v / IMAGE_HEIGHT;

   const viewport_upper_left = CAMERA_CENTER - [0, 0, focal_length] - viewport_u / 2 - viewport_v / 2;
   const pixel00_loc = viewport_upper_left + 0.5 * (pixel_delta_u + pixel_delta_v);

   return [pixel00_loc, pixel_delta_u, pixel_delta_v];
};

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

const worldHit = (r, int, rec) => {
   const tempRec = rec;
   let closestT = int.max;
   let hitAny = false;

   for (let objIndex of ti.static(ti.range(WorldLen))) {
      let obj = World[objIndex];
      let hit = false;

      if (obj.type === 1) {
         hit = Sphere.hit(obj.center, obj.radius, r, Interval.get(int.min, closestT), tempRec);
      }

      if (hit) {
         hitAny = true;
         closestT = tempRec.t;
         rec = tempRec;
      }
   }

   return hitAny;
};

const sampleSquare = (i, j, rnd) => {
   return [Random.randDouble(i, j, rnd) - 0.5, Random.randDouble(i, j, rnd) - 0.5, 0];
};

const gammaCorrect = (color) => {
   const intensity = Interval.get(0.0, 0.999);
   return [Interval.clamp(intensity, color.r), Interval.clamp(intensity, color.g), Interval.clamp(intensity, color.b)];
};

ti.addToKernelScope({
   get00PixelLoc,
   getFaceNormal,
   worldHit,
   gammaCorrect,
   sampleSquare
});

const pipeline = ti.kernel(() => {
   const pixel_samples_scale = 1.0 / spp;
   const rnd = [ti.random(), ti.random()];

   // rect from 2 tri's
   ti.clearColor(renderTarget, [0.0, 0.0, 0.0, 1.0]);
   for (let v of ti.inputVertices(vertices)) {
      ti.outputPosition([v.x, v.y, 0.0, 1.0]);
      ti.outputVertex(v);
   }

   for (let f of ti.inputFragments()) {
      // https://github.com/AmesingFlank/taichi.js/issues/13
      let _ = pixels[[0, 0]];

      const coord = (f + 1) / 2.0;
      let x = coord.x * IMAGE_WIDTH;
      let y = coord.y * IMAGE_HEIGHT;
      let color = [0.0, 0.0, 0.0];

      for (let _ of ti.static(ti.range(spp))) {
         let ray = Ray.get(x, y, rnd);
         color += Ray.getColor(ray);
      }

      ti.outputColor(renderTarget, [gammaCorrect(color * pixel_samples_scale).rgb, 1]);
   }

   return Random.randDouble(0, 0, rnd);
});

console.log(await pipeline());
