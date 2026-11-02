# ShortsMaker MCP 2.0 (The 10X Open-Source OpusClip Killer)

> **Next-Generation Autonomous Model Context Protocol (MCP) Server** that transforms long-form videos into high-retention, viral short-form clips (TikTok, Instagram Reels, YouTube Shorts).
> Works **100% Free locally with Zero AI APIs ($0 Cost)**, or supercharged with your favorite AI provider.

---

## ⚡ What Makes ShortsMaker 2.0 10X Better than OpusClip

| Feature | OpusClip (`opus.pro`) | ShortsMaker MCP 2.0 |
| :--- | :--- | :--- |
| **Pricing** | $19–$99/month strict credit subscription | **$0.00 Free Local Mode** or pay-as-you-go per video (cents) |
| **Dead Air & Pacing** | Leaves awkward silences, pauses and breaths | **Smart Silence & Jump-Cut Removal** (trims pauses to tight 80ms) |
| **Sound Design** | Background music only | **Beat-Synced SFX Foley Library** (whooshes on zooms, pops on subtitles, bass drops on hooks) |
| **Audio Mixing** | Static audio track | **Dynamic Audio Ducking** (music automatically ducks when voice speaks) |
| **Subtitles** | Generic box | **Kinetic Word Bounce + Pill Badge Box** (`hormozi_badge`, `mrbeast`, `neon`) |
| **Reframing** | Fixed crop that loses moving faces | **Full-Screen 9:16 Vertical Crop + Dynamic 110%-125% Punch Zooms** |
| **Workflow** | Generate 1 clip at a time through web queue | **One-Click Batch Engine (`batch_generate_shorts`)** |
| **AI Providers** | Closed black-box proprietary model | **Multi-Provider Support** (Groq, OpenAI, Gemini, Claude, Deepgram, Replicate, or Local) |

---

## 🌐 Supported AI Providers (All 100% Optional)

1. **Zero-API Local Mode (`local`)** — 100% Free, zero network calls, runs on local FFmpeg & subtitle heuristics.
2. **Groq (`GROQ_API_KEY`)** — Ultra-fast Whisper Large-v3 (~1s) + Llama 3.3 70B viral reasoning.
3. **OpenAI (`OPENAI_API_KEY`)** — Whisper-1 + GPT-4o-mini + DALL-E 3 visual cutaways.
4. **Google Gemini (`GEMINI_API_KEY`)** — Gemini 1.5 Flash multimodal video & transcript analysis.
5. **Anthropic (`ANTHROPIC_API_KEY`)** — Claude 3.5 Sonnet / Haiku retention analysis.
6. **Deepgram (`DEEPGRAM_API_KEY`)** — Deepgram Nova-2 high-accuracy speech-to-text.
7. **Replicate (`REPLICATE_API_TOKEN`)** — Incredibly-Fast-Whisper + Meta Llama 3 + Flux-Schnell.

---

## 🛠 Available MCP Tools

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `batch_generate_shorts` | `video_path_or_url`, `count`, `caption_style`, `layout`, `ai_provider` | **10X Batch Engine:** Ingests long video, isolates top 3–5 viral moments, reframes to 9:16 vertical, adds dynamic punch zooms, burns animated subtitles with hook banners, injects beat-synced SFX, and returns all ready-to-post shorts in 1 call! |
| `list_ai_providers` | *none* | Lists all 7 available providers, which API keys are configured, and the active default. |
| `analyze_long_video` | `video_path_or_url`, `target_clip_length`, `ai_provider` | Transcribes video, detects audience retention curves, and outputs ranked viral moments with virality scores (0-100). |
| `create_short_clip` | `video_path_or_url`, `start_time`, `duration`, `hook_title`, `layout`, `caption_style`, `enable_sfx`, `ai_provider` | Cuts video, reframes to 9:16 vertical, burns animated karaoke subtitles with hook banner, injects beat-synced SFX (whooshes, pops, hits). |
| `generate_broll_cutaway` | `prompt`, `style`, `ai_provider` | Generates 9:16 AI B-roll images (via Flux, DALL-E, or local motion canvas). |
| `generate_viral_metadata` | `topic_or_headline`, `keywords`, `platform` | Produces viral titles, descriptions, and hashtag clusters for TikTok, Reels, and Shorts. |
| `full_pipeline` | `video_path_or_url`, `caption_style`, `layout`, `ai_provider` | End-to-end automation: ingests long video, detects peak moment, reframes to 9:16, burns subtitles with SFX, and exports the final MP4. |

---

## 📦 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [FFmpeg](https://ffmpeg.org/) installed and available in your `PATH`

### 1. Clone & Install
```bash
git clone https://github.com/MahmudulRubel/shortsmaker-mcp.git
cd shortsmaker-mcp
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Leave blank for 100% Free Local Mode, or add any provider key)*

### 3. Connect to Claude / Antigravity / Cursor
```json
{
  "mcpServers": {
    "shortsmaker": {
      "command": "node",
      "args": ["/path/to/shortsmaker-mcp/src/index.js"]
    }
  }
}
```

---

## 🧪 Testing

Run the automated 7-step verification suite:
```bash
npm test
```

---

## 📄 License
MIT License
