# Architecture Context — ShortsMaker MCP

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| MCP Protocol | `@modelcontextprotocol/sdk` (v1.32+) | Stdio server exposing video automation tools |
| Runtime | Node.js (v18+ ESM) | Core process orchestrator and pipeline coordinator |
| Video Engine | FFmpeg (v6.0 - v8.0+) + FFprobe | Cutting, cropping, color pop, subtitle burning, audio mixing |
| Face Tracking | Python 3.13 / MediaPipe + OpenCV | Frame sampling, 9:16 bounding box calculation, EMA camera pan |
| Speech Engine | Local VTT + Groq / OpenAI / Deepgram / Replicate | Word-level timestamped transcription |
| Subtitles | Advanced SubStation Alpha (`.ass` format) | High-contrast kinetic typography, pill badges, and hook banners |
| Sound Design | Custom SFX Foley Engine (WAV buffers) | Dynamic FFmpeg audio filtergraph with beat-synced amix |

## System Boundaries

- `src/index.js` — MCP Server entry point. Registers 5 tools (`analyze_long_video`, `create_short_clip`, `batch_generate_shorts`, `generate_broll_cutaway`, `generate_viral_metadata`), manages stdio transport, and coordinates pipeline execution.
- `src/videoProcessor.js` — FFmpeg filtergraph builder and encoding executor. Handles 1080x1920 9:16 cropping, alternating 120% punch zooms, color grading (`eq`), subtitle burning, and SFX mixing.
- `src/faceTracker.js` & `src/face_tracker.py` — Face tracking bridge. Python child process extracts facial centers at 2 fps, smooths coordinates, and generates nested linear interpolation formulas for FFmpeg.
- `src/subtitleGenerator.js` — Generates ASS subtitle files with kinetic word-by-word highlights, pill badges, and top curiosity banners.
- `src/downloader.js` — Resolves video sources (local files, direct MP4 URLs, and YouTube videos via `yt-dlp` with auto-subtitles).
- `src/aiProviderService.js` — Multi-provider router. Automatically chooses active provider (Local, Groq, OpenAI, Gemini, Anthropic, Deepgram, Replicate).
- `src/sfxEngine.js` — SFX synthesizer. Mixes pops on subtitle beats, whooshes on zoom transitions, and bass hits on hook entries.

## Storage Model

- `storage/inputs/` — Ingested and downloaded raw videos (e.g. `yt_*.mp4`).
- `storage/audio/` — 16kHz mono extracted MP3s for transcription.
- `storage/subtitles/` — Spoken word VTTs and generated styled ASS subtitle files.
- `storage/outputs/` — Final exported 1080x1920 viral shorts (ready for posting).
- `storage/sfx/` — Bundled audio Foley WAVs (whoosh, pop, hit, riser).
- `models/` — Pre-trained face detector models (`blaze_face_short_range.tflite`, `haarcascade_frontalface_default.xml`).

## Non-Negotiable Invariants

1. **Always 1080x1920 Full-Bleed (9:16)**: Never export letterboxed or black-barred videos by default. The vertical video must always fill the full 1080x1920 frame.
2. **Subtitles Explicit Syntax (`subtitles=filename='...'`)**: Always use `filename=` when invoking FFmpeg's `subtitles` filter with drive letters (e.g., `C\:/...`) to prevent FFmpeg from misparsing colons as the `original_size` option.
3. **Commas in Filter Expressions Must Be Escaped**: All inner commas in mathematical crop expressions (e.g. `if(lte(t\,1.5)\,...)`) must be escaped with `\,` so FFmpeg does not interpret them as filterchain delimiters.
4. **Portable Path Resolution (`fileURLToPath`)**: Never use relative `./` paths for internal package assets (`models/`, `storage/sfx/`, `face_tracker.py`). Always resolve using `fileURLToPath(import.meta.url)`.
5. **Zero-Fail Captions Guarantee**: If a video lacks spoken transcription or API keys are absent, the engine must synthesize rhythmic visual text cues rather than rendering a short with blank/missing captions.
