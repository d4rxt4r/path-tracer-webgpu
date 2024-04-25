import * as ti from './lib/taichi.dev.js';

import { getFaceNormal, hitSphere } from './Hittable.js';
import { rayAt } from './Ray.js';

await ti.init();

const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 512;
const CAMERA_CENTER = [0, 0, 0];

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
   pixels,
   vertices,
   renderTarget,
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

const rayColor = (ray) => {
   let result = [0.0, 0.0, 0.0];
   let closestT = 10000.0;
   const tempRec = {
      t: 0.0,
      p: [0.0, 0.0, 0.0],
      normal: [0.0, 0.0, 0.0]
   };
   let rec = tempRec;
   let hitAny = false;
   for (let objIndex of ti.Static(ti.range(WorldLen))) {
      let obj = World[objIndex];
      let hit = false;

      if (obj.type === 1) {
         hit = hitSphere(obj.center, obj.radius, ray, 0.0, closestT, tempRec);
      }

      if (hit) {
         hitAny = true;
         closestT = tempRec.t;
         rec = tempRec;
      }
   }

   if (hitAny) {
      result = 0.5 * (rec.normal + [1, 1, 1]);
   } else {
      const unit_direction = ti.normalized(ray.direction);
      const a = 0.5 * (unit_direction.y + 1.0);
      result = (1.0 - a) * [1.0, 1.0, 1.0] + a * [0.5, 0.7, 1.0];
   }

   return result;
};

ti.addToKernelScope({ World, WorldLen: World.length, get00PixelLoc, getFaceNormal, rayAt, rayColor, hitSphere });

const pipeline = ti.kernel(() => {
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

      const pixel_info = get00PixelLoc();

      let ray = {
         origin: CAMERA_CENTER,
         direction: pixel_info[0] + x * pixel_info[1] + y * pixel_info[2]
      };

      let color = rayColor(ray);
      ti.outputColor(renderTarget, [color.rgb, 1]);
   }

   return get00PixelLoc();
});

console.log(await pipeline());
