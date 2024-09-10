# Features to add
- Add rerender button
- Loading scene anim
- More stable and reliable camera movement
- Render BVH Nodes

# Optimizations to made
- Refactor computational functions
- Use native bindings and write compute shaders instead of using [taichi.js](https://taichi-js.com/docs/docs/basics/getting-started)
- Store scene data in vectors, not structs ?
- Use custom randomizer to prevent similarity in samples

# Path tracer features to add
- Textures (from image)
- Noise
- Height Maps
- Rotation and Translation (Instancing)
- Volumes (Fog)
- PDFs (Light sampling)
- Import meshes