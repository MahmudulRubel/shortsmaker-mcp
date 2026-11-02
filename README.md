# ShortsMaker MCP (AI Long-Video to Viral Shorts)

> **Autonomous Model Context Protocol (MCP) Server** that transforms long-form videos into high-retention, viral short-form clips (TikTok, Instagram Reels, YouTube Shorts) — **works 100% Free locally with Zero AI APIs, or supercharged with your favorite AI provider**.

---

## ⚡ Zero AI API vs Cloud AI Providers

ShortsMaker does **NOT** require any paid AI subscriptions or cloud API keys to run.

| Feature | Zero-API Local Engine ($0 Cost) | Cloud AI Providers (Groq, OpenAI, Gemini, Claude, Replicate, Deepgram) |
| :--- | :--- | :--- |
| **Cost** | **$0.00 (100% Free & Offline)** | Pay-as-you-go per video (cents) |
| **Subtitles** | Local VTT / SRT / ASS extraction & FFmpeg parser | Word-level speech-to-text (Whisper Large-v3 / Nova-2) |
| **Viral Pacing** | Audio volume energy & pattern-interrupt heuristics | LLM curiosity gap, hook strength & retention curves |
| **Framing** | Full-screen 9:16 vertical crop + dynamic punch zooms | Full-screen 9:16 vertical crop + dynamic punch zooms |
| **Color & Audio** | Dynamic color pop (+18% contrast, +35% saturation) & SFX | Dynamic color pop & multi-track SFX mixing |
| **B-Roll Visuals** | Aesthetic motion blur canvas & kinetic overlays | AI-generated photorealistic 9:16 cutaways (Flux / DALL-E) |

---

## 🌐 Supported AI Providers (All 100% Optional)

You can run completely offline, or connect any of the 6 leading AI engines by adding keys to your environment:

1. **Local Mode (`local`)** — 100% Free, zero external network calls, runs on local FFmpeg & subtitle heuristics.
2. **Groq (`GROQ_API_KEY`)** — Ultra-fast Whisper Large-v3 transcription (~1s) + Llama 3.3 70B viral reasoning.
3. **OpenAI (`OPENAI_API_KEY`)** — Whisper-1 audio transcription + GPT-4o-mini + DALL-E 3 visual cutaways.
4. **Google Gemini (`GEMINI_API_KEY`)** — Gemini 1.5 Flash multimodal video & transcript analysis.
5. **Anthropic (`ANTHROPIC_API_KEY`)** — Claude 3.5 Sonnet / Haiku retention analysis.
6. **Deepgram (`DEEPGRAM_API_KEY`)** — Deepgram Nova-2 high-accuracy speech-to-text with word timestamps.
7. **Replicate (`REPLICATE_API_TOKEN`)** — Incredibly-Fast-Whisper + Meta Llama 3 + Flux-Schnell B-roll.

---

## 🛠 Available MCP Tools

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `list_ai_providers` | *none* | Lists all 7 available providers, which API keys are configured, and the active default. |
| `analyze_long_video` | `video_path_or_url`, `target_clip_length`, `ai_provider` | Transcribes video, detects audience retention curves, and outputs ranked viral moments with virality scores (0-100). |
| `create_short_clip` | `video_path_or_url`, `start_time`, `duration`, `layout`, `caption_style`, `ai_provider` | Cuts video, reframes to 9:16 vertical (viral fullscreen punch, blurred background, or smart crop), burns animated karaoke subtitles with emojis, adds punch zooms and SFX. |
| `generate_broll_cutaway` | `prompt`, `style`, `ai_provider` | Generates 9:16 AI B-roll images (via Flux, DALL-E, or local motion canvas). |
| `generate_viral_metadata` | `topic_or_headline`, `keywords`, `platform` | Produces viral titles, descriptions, and hashtag clusters for TikTok, Reels, and Shorts. |
| `full_pipeline` | `video_path_or_url`, `caption_style`, `layout`, `ai_provider` | End-to-end automation: ingests long video, detects peak moment, reframes to 9:16, burns subtitles, and exports the final MP4. |

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
*(Leave empty to run in 100% Free Local Mode, or add any provider key you want to use)*

### 3. Add to MCP Configuration

Add to your `claude_desktop_config.json`, `mcp_config.json`, or Antigravity configuration:

#### Option A: 100% Free / Zero-API Local Mode
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

#### Option B: Supercharged with Cloud AI (Any Provider)
```json
{
  "mcpServers": {
    "shortsmaker": {
      "command": "node",
      "args": ["/path/to/shortsmaker-mcp/src/index.js"],
      "env": {
        "GROQ_API_KEY": "gsk_...",
        "OPENAI_API_KEY": "sk-...",
        "GEMINI_API_KEY": "AIza...",
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "DEEPGRAM_API_KEY": "...",
        "REPLICATE_API_TOKEN": "r8_..."
      }
    }
  }
}
```

---

## 🧪 Testing

Run the automated 6-step test suite:
```bash
npm test
```

---

## 📄 License
MIT License
