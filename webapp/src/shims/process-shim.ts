// Lightweight browser shim for `process` to avoid runtime ReferenceError
// This file intentionally keeps a minimal shape to satisfy code that only
// reads `process.env` or `process.platform` in browser bundles.
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = { env: {}, platform: 'browser' };
} else {
  if (typeof (globalThis as any).process.env === 'undefined') (globalThis as any).process.env = {};
  if (typeof (globalThis as any).process.platform === 'undefined') (globalThis as any).process.platform = 'browser';
}

export {};
