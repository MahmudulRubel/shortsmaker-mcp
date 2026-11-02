# AI Workflow Rules

## Approach

ShortsMaker MCP is developed using an incremental, spec-driven workflow guided by the **ContextZen Methodology**. AI agents working in this repository (Antigravity, Cursor, Windsurf, Claude Desktop/Code) must adhere strictly to these operational boundaries.

---

## Scoping Rules

1. **Read Context First**: Before modifying any code, the agent must review `context/architecture.md` and `context/code-standards.md`.
2. **One Feature Unit at a Time**: Complete, verify, and test a single component before moving to the next.
3. **No Speculative Rewrites**: Do not replace working core libraries (e.g., swapping FFmpeg with another tool) unless explicitly ordered.
4. **Preserve Compatibility**: Keep the MCP tool interfaces (`analyze_long_video`, `create_short_clip`, `generate_broll_cutaway`, `generate_viral_metadata`, `full_pipeline`) backward-compatible.

---

## Protected Files

Do not modify or commit the following:
- `.env` / credentials: API keys must remain strictly in local environment variables.
- `storage/**`: Media downloads, processed clips, and caches are runtime data and must never be committed to git.
- Third-party packages: Never edit files inside `node_modules/`.

---

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:
- `architecture.md`: Whenever system boundaries, external tools, or invariants change.
- `code-standards.md`: Whenever code conventions, path resolution, or escaping rules change.
- `ui-context.md`: Whenever subtitle designs, fonts, or aspect ratio parameters change.
- `progress-tracker.md`: Whenever any feature, bug fix, or milestone is completed.

---

## Verification Checklist

Before declaring any task complete or committing changes, verify this complete checklist:
- [ ] **Aspect Ratio**: Output video is strictly 1080x1920 (9:16 vertical full-bleed).
- [ ] **Filtergraph Escaping**: Subtitle file path uses `subtitles=filename='...'` with escaped colons/slashes, and expression commas are escaped with `\,`.
- [ ] **Portable Paths**: File paths derived with `fileURLToPath(import.meta.url)` to guarantee execution in all IDEs.
- [ ] **Tests Pass**: `node tests/test_mcp.js` passes 100% of test cases.
- [ ] **Context Updated**: `context/progress-tracker.md` reflects the changes.
