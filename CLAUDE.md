## Application Building Context (ContextZen)

Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — Product scope, core workflows, and viral video standards.
2. `context/architecture.md` — System structure, multi-provider stack, FFmpeg engine, and invariants.
3. `context/ui-context.md` — 9:16 vertical video specs, caption styling tokens, and layout safe zones.
4. `context/code-standards.md` — Node.js ESM rules, absolute path resolution, and error handling.
5. `context/ai-workflow-rules.md` — Agent scoping rules, verification protocol, and protected files.
6. `context/progress-tracker.md` — Current phase, completed work, and session log.

### Key Rules
- Read `context/architecture.md` before touching `src/videoProcessor.js` or `src/subtitleGenerator.js`.
- **Onboarding Protocol**: When a user begins a video workflow, ask the onboarding questions (video source, number of shorts, duration sweet spot 40-60s, caption style, and framing) with selectable options.
- Always verify changes with `node tests/test_mcp.js`.
- Update `context/progress-tracker.md` after each meaningful implementation step.
