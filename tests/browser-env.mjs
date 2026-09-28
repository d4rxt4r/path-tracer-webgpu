// Taichi's browserified TypeScript compiler misdetects Node's process as a native environment.
// Initialize only its type definitions in browser mode; restore Node before running CPU tests.
const nodeProcess = globalThis.process;
try {
    globalThis.process = undefined;
    await import('../lib/taichi.js');
} finally {
    globalThis.process = nodeProcess;
}
