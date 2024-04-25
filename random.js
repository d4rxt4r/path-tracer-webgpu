const randDouble = (x, y, rnd) => {
   rnd.x = (sin(dot([x, y] + rnd, [12.9898, 78.233])) * 43758.5453123) % 1;
   rnd.y = (sin(dot([x, y] + rnd, [12.9898, 78.233])) * 43758.5453123) % 1;

   return abs((sin(dot([x, y] + rnd, [12.9898, 78.233])) * 43758.5453123) % 1);
};
export default {
   randDouble
};
