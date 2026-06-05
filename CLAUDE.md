# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (starts watch + local server on port 5000)
npm run dev

# Production build (outputs to .tmp/build/static/)
npm run build

# Rollup watch only (no dev server)
npm run watch

# Serve built output only (without watch)
npm run serve

# Debug Rollup build with Node inspector
npm run debug
```

There are no automated tests. Linting runs automatically via Husky pre-commit hooks using `lint-staged`:

- JS/TS/CSS/JSON/MD → Prettier
- C/C++ → clang-format
- Rust → rustfmt

To format manually: `npx prettier --write <file>`

## Architecture

Squoosh is a **browser-based image compression PWA** — all image processing runs client-side with no server involvement. The build uses **Rollup** with many custom plugins targeting three distinct TypeScript compilations: client, worker, and static-build.

### TypeScript Project References

The repo uses TypeScript project references with separate tsconfig files:

- `client-tsconfig.json` — DOM + ESNext (Preact UI code)
- `worker-tsconfig.json` — WebWorker + ESNext (codec worker thread)
- `static-build-tsconfig.json` — Node (SSG/pre-render)
- `generic-tsconfig.json` — Base config with shared path aliases

**Path aliases** (usable in all projects):

- `static-build/*` → `src/static-build/*`
- `client/*` → `src/client/*`
- `shared/*` → `src/shared/*`
- `features/*` → `src/features/*`
- `worker-shared/*` → `src/worker-shared/*`

### Client / Worker Split

The app runs two JS environments:

1. **Client** (`src/client/`) — Preact UI. The main app (`initial-app/`) loads, then lazy-loads the heavy codec UI (`lazy-app/`).
2. **Worker** (`src/features-worker/index.ts`) — **Auto-generated** by `lib/feature-plugin.js`. Do not edit manually. It exposes all codec functions from every feature's `worker/` folder via Comlink.

Client and worker communicate via **Comlink** (`WorkerBridge`), which wraps the worker in an async proxy. The client calls codec functions as if they were local async functions.

### Feature Plugin System

All codecs and image operations live in `src/features/` as self-contained plugins. The Rollup plugin at `lib/feature-plugin.js` scans this directory and auto-generates the worker entry point.

Feature types:

- **encoders** — encode `ImageData` → `ArrayBuffer`
- **decoders** — decode `ArrayBuffer` → `ImageData`
- **processors** — transform `ImageData` (e.g., resize, quantize); applied per-side independently
- **preprocessors** — transform `ImageData` applied to both sides (e.g., rotate)

Within each feature, files are organized by target environment:

- `shared/` — accessible from both client and worker
- `client/` — client-only (UI components, `encode()` orchestration)
- `worker/` — worker-only; each exported default function is bundled into the worker under the filename as key

**Encoder contract** (`shared/meta.ts` + `client/index.ts`):

- `shared/meta.ts` must export: `label`, `mimeType`, `extension`, `EncodeOptions` interface, `defaultOptions`
- `client/index.ts` must export: `encode(signal: AbortSignal, worker: WorkerBridge, data: ImageData, options: EncodeOptions): Promise<ArrayBuffer>`
- Optionally: `featureTest(): boolean` for capability detection, and an `Options` Preact component with `{ options, onChange }` props

### WASM Codecs

Pre-compiled WASM binaries live in `src/features/<codec>/enc/` and `src/features/<codec>/dec/`. Source for these is in `codecs/` (C++/Rust). Rebuilding WASM requires Docker with Emscripten (C++) or Rust toolchains — see `codecs/README.md`. During normal development, the pre-built `.wasm` files are used as-is.

### Build Output

Rollup outputs to `.tmp/build/`. The `lib/move-output.js` script (run after production build) reorganizes the output into `static/`. JS chunks are output in AMD format; assets are content-hashed in `static/c/`.

Custom Rollup plugins in `lib/`:

- `feature-plugin.js` — scans features, generates worker entry + tsconfig
- `client-bundle-plugin.js` — creates lazy-loadable client bundle
- `css-plugin.js` — PostCSS with modules, nesting, and simple vars
- `simple-ts.js` — TypeScript compilation
- `sw-plugin.js` — Service Worker handling
- `initial-css-plugin.js` — extracts critical CSS for SSR shell
