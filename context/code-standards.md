# Code Standards

## General principles

- **Root Cause Solutions**: Never apply shallow workarounds (e.g., removing a flag or filter). Solve the root cause (e.g., proper string escaping for FFmpeg).
- **Graceful Degradation**: Always provide robust fallback paths (e.g. if MediaPipe face tracking is unavailable, fallback to center crop without crashing the pipeline).
- **Process Stability**: The MCP server is a persistent daemon. A failure in video rendering or AI analysis must **never** crash the server process.
- **Portability First**: Always derive absolute directory and file paths using `fileURLToPath(import.meta.url)` to prevent execution breakage across different working directories and IDE environments.

---

## TypeScript rules and JavaScript Standards

- **Module Format**: Pure ESM (`"type": "module"` in `package.json`).
- **Imports**: All local file imports must explicitly include the `.js` extension (e.g., `import { renderShort } from './video_engine.js';`).
- **Type Safety**: While written in modern Node.js JavaScript, codebase follows TypeScript rules: strict JSDoc typing on public functions, defensive schema validation on external JSON inputs, and strict null/undefined checks.
- **Path Resolution**: Never use relative paths like `./storage`. Always compute absolute package paths:
  ```javascript
  import { fileURLToPath } from 'url';
  import path from 'path';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const ROOT_DIR = path.resolve(__dirname, '..');
  const STORAGE_DIR = path.join(ROOT_DIR, 'storage');
  ```
- **Asynchronous Execution**: Always use `async/await` and Promises over callback patterns. Use `execFile` or promisified `spawn` when running external binaries.

---

## Styling conventions and Filtergraph Escaping

- **FFmpeg Subtitle Escaping**: Always use `subtitles=filename='${escapedPath}'` where backslashes, colons, and single quotes are safely escaped:
  ```javascript
  const escapedPath = subPath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\\\''");
  ```
- **Filtergraph Commas**: Inside `-filter_complex`, commas separate filters. Inside mathematical or conditional expressions (like `if(...)` or `lerp(...)`), commas **MUST be escaped with a backslash** (`\,`).
- **ASS Subtitle Formatting**: Follow color tokens and margin definitions specified in `ui-context.md`. Do not hardcode arbitrary font sizes or colors directly in render loops.

---

## File Organization

The project is structured into clear, decoupled single-responsibility modules:

- `src/` — Primary application source code:
  - `src/index.js` — MCP Server entry point, tool registration, and protocol handlers.
  - `src/video_engine.js` — Core video rendering, FFmpeg filter pipeline, aspect ratio crop, and audio mixing.
  - `src/ai_analyzer.js` — Multi-provider AI transcript analysis and viral moment curation.
  - `src/subtitle_generator.js` — ASS kinetic karaoke subtitle creation and word timing synchronization.
  - `src/face_tracker.py` — Standalone Python MediaPipe face detection and tracking bridge.
- `storage/` — Local runtime cache directory (ignored by git):
  - `storage/downloads/` — Downloaded source videos and audio tracks.
  - `storage/subtitles/` — Generated `.ass` and `.vtt` subtitle files.
  - `storage/clips/` — Exported short-form video outputs (`.mp4`).
  - `storage/metadata/` — Stored viral clip summaries and posting metadata (`.json`).
- `context/` — ContextZen specification and architecture documentation.
- `tests/` — Automated test suite:
  - `tests/test_mcp.js` — Comprehensive MCP tool integration verification suite.
