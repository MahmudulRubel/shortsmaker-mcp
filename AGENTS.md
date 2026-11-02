# AGENTS.md — Entry Point for AI Coding Agents

Welcome to **ShortsMaker MCP**! This project follows the **ContextZen Methodology**.

Before making any code changes, reading specs, or executing tasks, any AI agent or IDE (Antigravity, Cursor, Claude Code, Windsurf) MUST read the context files in `context/` in the exact order below:

## Context Read Order

1. **[project-overview.md](file:///context/project-overview.md)** — Product scope, core viral video workflows, goals, and success criteria.
2. **[architecture.md](file:///context/architecture.md)** — Multi-AI provider architecture, FFmpeg filter escaping, MediaPipe face tracking, storage model, and non-negotiable invariants.
3. **[code-standards.md](file:///context/code-standards.md)** — Node.js ESM standards, absolute path resolution via `fileURLToPath`, and Python subprocess bridge rules.
4. **[ui-context.md](file:///context/ui-context.md)** — 9:16 vertical video specifications, typography, safe zone margins, and caption styles (`hormozi`, `hormozi_badge`, `mrbeast`, `neon`).
5. **[ai-workflow-rules.md](file:///context/ai-workflow-rules.md)** — Agent execution protocol, single-unit scoping, protected files, and verification checklist.
6. **[progress-tracker.md](file:///context/progress-tracker.md)** — Version milestones (v2.2.0), completed features, and active build queue.

## Critical Instructions for Agents
- **Context First**: Always consult `context/architecture.md` before modifying video rendering or subtitle generation code.
- **Invariants Rule**: Never break the 5 non-negotiable invariants in `context/architecture.md` (e.g. Always 1080x1920 full-bleed vertical, `filename=` subtitle escaping, portable paths).
- **Onboarding Protocol**: Whenever a user installs this MCP or asks to make shorts without specifying full preferences, immediately prompt them with the interactive onboarding questions (video source, number of clips, duration sweet spot, caption style, and framing) with clickable/selectable options.
- **Verification Rule**: Run `node tests/test_mcp.js` after every modification before reporting completion.
- **Sync Rule**: Always update `context/progress-tracker.md` after completing a meaningful change or feature.

## Interactive User Onboarding Protocol
When a user begins a video workflow, prompt them to click and select:
1. **Video Source**: YouTube URL or local video file path.
2. **Number of Shorts**:
   - `(Recommended) 3 Shorts` (Optimal variety & fast rendering)
   - `1 Short` (Quick single preview)
   - `5 Shorts` (Daily social cluster)
   - `10 Shorts` (Full weekly viral batch)
3. **Clip Duration**:
   - `(Recommended) 40–60 seconds` (Sweet spot for maximum TikTok, Reels & Shorts retention)
   - `30–45 seconds` (High tempo, rapid hooks)
   - `15–30 seconds` (Micro attention hooks)
   - `60–90 seconds` (In-depth storytelling)
4. **Caption Style**:
   - `(Recommended) hormozi_badge` (Yellow/green bold words with high-contrast black pill boxes)
   - `hormozi` (Electric green active word highlight with clean outline)
   - `mrbeast` (High-impact yellow & red text with heavy drop shadow)
   - `neon` (Cyberpunk cyan & magenta glowing subtitles)
   - `minimal` (Clean white subtitles with subtle outline)
5. **Framing & Aspect Ratio**:
   - `(Recommended) viral_fullscreen_punch with AI Face Tracking` (1080x1920 full-bleed mobile display)
   - `blurred_background` (Original video centered with ambient blurred background)
   - `split_screen` (Top & bottom podcast/reaction layout)
