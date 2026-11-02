# Progress Tracker

Update this tracker after every meaningful implementation change.

## Current Phase
- **Phase**: Complete (ContextZen Integration Verified)
- **Version**: `2.3.0`

## Current Goal
- Equip ShortsMaker MCP with ContextZen Methodology files so any AI IDE (Antigravity, Cursor, Windsurf, Claude Desktop/Code) reads context first and maintains strict architectural invariants.

---

## Completed
- [x] Created root entry points: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules`.
- [x] Authored full ContextZen 6-file suite in `context/`:
  - `project-overview.md`: Product scope, sweet-spot retention, zero-API local mode.
  - `architecture.md`: Multi-AI provider architecture, storage boundaries, 5 invariants.
  - `ui-context.md`: 1080x1920 canvas, safe zones, typography, ASS color palette.
  - `code-standards.md`: Node ESM, FFmpeg filter escaping, Python bridge conventions.
  - `ai-workflow-rules.md`: Agent boundaries, verification checklist, protected paths.
  - `progress-tracker.md`: Version milestones and roadmap.
- [x] Multi-IDE absolute path portability using `fileURLToPath(import.meta.url)`.
- [x] MediaPipe AI face tracking with dynamic camera pan and smooth `lerp`.
- [x] FFmpeg subtitle path escaping (`subtitles=filename='...'`).
- [x] Comprehensive test suite in `tests/test_mcp.js`.

---

## In Progress
- [ ] Optional programmatic ContextZen retrieval tool via MCP protocol.

---

## Next Up
1. **Dynamic B-Roll Auto-Insertion**: Overlaying relevant visual b-roll clips based on transcript keywords.
2. **Audio Carving & Auto-Ducking**: Automatically mixing background music with speech ducking.
3. **Multi-Speaker Detection**: Automatically cutting camera between multiple speakers in podcast interviews.

---

## Release History & Milestones

### v2.3.0 — ContextZen Integration
- ContextZen specification and IDE entry points deployed.
- Verified with ContextZen validator and `tests/test_mcp.js`.

### v2.2.0 — Multi-IDE Portability & Dynamic Tracking
- Absolute path refactor via `fileURLToPath(import.meta.url)`.
- FFmpeg dynamic pan comma escaping fix.
- Automated end-to-end integration test suite.

### v2.1.0 — Smart Face Tracking & Fullscreen Engine
- MediaPipe face tracking integration.
- Full-bleed 1080x1920 9:16 vertical video crop.
- ASS subtitle filename escaping fix.

### v2.0.0 — Initial MCP Release
- 5 core MCP tools for video analysis and generation.
- Support for Gemini, Groq, Ollama, and local fallbacks.
