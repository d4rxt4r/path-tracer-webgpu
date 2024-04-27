import * as ti from './lib/taichi.dev.js';

import Hittable from './Hittable.js';
import Interval from './Interval.js';
import Sphere from './Sphere.js';
import Ray from './Ray.js';
import Random from './Random.js';
import Material from './Material.js';

await ti.init();

const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 256;
const CAMERA_CENTER = [0, 0, 0];
const MAX_SAMPLES = 100;
const MAX_DEPTH = 50;

const htmlCanvas = document.getElementById('canvas');
const renderTarget = ti.canvasTexture(htmlCanvas);
const canvas = new ti.Canvas(htmlCanvas);
htmlCanvas.width = IMAGE_WIDTH;
htmlCanvas.height = IMAGE_HEIGHT;
htmlCanvas.style.zoom = '1.5';

const colorBuffer = ti.Vector.field(3, ti.f32, [IMAGE_WIDTH, IMAGE_HEIGHT]);
const imageBuffer = ti.Vector.field(4, ti.f32, [IMAGE_WIDTH, IMAGE_HEIGHT]);

// Object types:
// 1 - Sphere
const World = [
   // ground
   {
      type: 1,
      mat: 0,
      albedo: [0.8, 0.8, 0.0],
      center: [0, -100.5, -1],
      radius: 100
   },
   // center sphere
   {
      type: 1,
      mat: 0,
      albedo: [0.1, 0.2, 0.5],
      center: [0, 0, -1.2],
      radius: 0.5
   },
   // left sphere
   {
      type: 1,
      mat: 1,
      albedo: [0.8, 0.8, 0.8],
      center: [-1, 0, -1],
      radius: 0.5
   },
   // right sphere
   {
      type: 1,
      mat: 1,
      albedo: [0.8, 0.6, 0.2],
      center: [1, 0, -1],
      radius: 0.5
   }
];

ti.addToKernelScope({
   IMAGE_WIDTH,
   IMAGE_HEIGHT,
   CAMERA_CENTER,
   MAX_DEPTH,
   World,
   WorldLen: World.length,
   colorBuffer,
   imageBuffer,
   renderTarget,
   Hittable,
   Random,
   Ray,
   Interval,
   Sphere,
   Material
});

const get00PixelLoc = () => {
   const focal_length = 1.0;
   const viewport_height = 2.0;
   const viewport_width = viewport_height * (IMAGE_WIDTH / IMAGE_HEIGHT);
   const viewport_u = [viewport_width, 0.0, 0.0];
   const viewport_v = [0.0, viewport_height, 0.0];

   const pixel_delta_u = viewport_u / IMAGE_WIDTH;
   const pixel_delta_v = viewport_v / IMAGE_HEIGHT;

   const viewport_upper_left = CAMERA_CENTER - [0.0, 0.0, focal_length] - viewport_u / 2 - viewport_v / 2;
   const pixel00_loc = viewport_upper_left + 0.5 * (pixel_delta_u + pixel_delta_v);

   return [pixel00_loc, pixel_delta_u, pixel_delta_v];
};

const worldHit = (r, int, rec) => {
   const tempRec = rec;
   let closestT = int.max;
   let hitAny = false;

   for (let objIndex of ti.static(ti.range(WorldLen))) {
      let obj = World[objIndex];
      let hit = false;

      if (obj.type === 1) {
         hit = Sphere.hit(obj, r, Interval.get(int.min, closestT), tempRec);
      }

      if (hit) {
         hitAny = true;
         closestT = tempRec.t;
         rec = tempRec;
      }
   }

   return hitAny;
};

const gammaCorrect = (color) => {
   const intensity = Interval.get(0.0, 0.999);
   return [
      Interval.clamp(intensity, ti.sqrt(color.r)),
      Interval.clamp(intensity, ti.sqrt(color.g)),
      Interval.clamp(intensity, ti.sqrt(color.b)),
      1.0
   ];
};

ti.addToKernelScope({
   get00PixelLoc,
   worldHit,
   gammaCorrect
});

const toneMap = ti.kernel((total_samples) => {
   for (const I of ndrange(IMAGE_WIDTH, IMAGE_HEIGHT)) {
      imageBuffer[I] = gammaCorrect(colorBuffer[I] / total_samples);
   }
});

const render = ti.kernel(() => {
   for (let UV of ti.ndrange(IMAGE_WIDTH, IMAGE_HEIGHT)) {
      let x = UV[0];
      let y = UV[1];
      let ray = Ray.get(x, y);
      colorBuffer[UV] += Ray.getColor(ray);
   }

   return Random.vec3_2(-1, 1);
});

let total_samples = 0;
const main = async () => {
   render();
   total_samples += 1;
   toneMap(total_samples);
   canvas.setImage(imageBuffer);
   if (total_samples < MAX_SAMPLES) {
      requestAnimationFrame(main);
   }
};

await main();
