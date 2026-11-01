# ShortsMaker MCP (AI Long-Video to Viral Shorts)

> **Autonomous Model Context Protocol (MCP) Server** that transforms long-form videos into high-retention, viral short-form clips (TikTok, Instagram Reels, YouTube Shorts) powered by **Replicate** & **FFmpeg**.

---

## ⚡ Key Highlights & Capabilities

- 🤖 **Native MCP Server:** Implements standard JSON-RPC tools compatible with Claude Desktop, Antigravity, Cursor, and any MCP client.
- 🎯 **Full-Screen 9:16 Framing:** Intelligent vertical reframing and dynamic punch-in zooms (110%–130%) with zero letterboxing.
- 🎨 **Visual Pop Grade:** Automatic contrast and saturation grading for mobile feeds.
- 🔤 **Dynamic Karaoke Subtitles:** Centered animated subtitles with word-by-word active highlighting (Hormozi, MrBeast, Neon, Clean styles).
- 🔊 **Multi-Track Audio Engine:** Automated voice normalization, transition whooshes, hook impact sound effects, and quiet ambient music beds.
- 🚀 **Cost-Effective & Open:** No expensive monthly subscriptions; runs locally with FFmpeg and pay-as-you-go Replicate models.

---

## 🛠 Available MCP Tools

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `analyze_long_video` | `videoUrlOrPath`, `targetDuration` | Transcribes audio via Replicate Whisper, calculates viral hooks, pacing, and returns ranked clip timestamps. |
| `create_short_clip` | `inputVideoPath`, `startTime`, `duration`, `aspectRatio`, `subtitleStyle`, `overlayBroll` | Cuts, reframes to 9:16 vertical, generates animated karaoke subtitles, adds dynamic punch zooms and SFX. |
| `generate_broll_cutaway` | `prompt`, `duration` | Generates vertical AI visual cutaway imagery via Flux Schnell or SDXL. |
| `generate_viral_metadata` | `topicOrTranscript` | Generates high-converting titles, descriptions, and hashtag clusters for TikTok, Reels, and Shorts. |
| `full_pipeline` | `videoUrlOrPath`, `subtitleStyle` | End-to-end automation: ingests long video, detects peak viral moments, reframes, captions, and renders final MP4. |

---

## 📦 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [FFmpeg](https://ffmpeg.org/) installed and available in your `PATH`
- [Replicate API Token](https://replicate.com/account/api-tokens)

### 1. Clone & Install
```bash
git clone https://github.com/MahmudulRubel/shortsmaker-mcp.git
cd shortsmaker-mcp
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Replicate token:
```env
REPLICATE_API_TOKEN=r8_your_token_here
```

### 3. Add to MCP Configuration

Add this server to your `claude_desktop_config.json`, `mcp_config.json`, or Antigravity configuration:

```json
{
  "mcpServers": {
    "shortsmaker": {
      "command": "node",
      "args": ["/path/to/shortsmaker-mcp/src/index.js"],
      "env": {
        "REPLICATE_API_TOKEN": "r8_your_token_here"
      }
    }
  }
}
```

---

## 🧪 Testing

Run the automated verification suite:
```bash
npm test
```

---

## 📄 License
MIT License
