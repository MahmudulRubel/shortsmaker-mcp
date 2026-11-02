# Project Overview — ShortsMaker MCP

## Overview
**ShortsMaker MCP** is a 10X next-generation AI video automation engine and Model Context Protocol (MCP) server. It turns long-form horizontal videos (YouTube links, podcasts, lectures, webinars) into high-retention viral vertical shorts (TikTok, Instagram Reels, YouTube Shorts) in seconds.

It operates seamlessly in **100% Free / Zero-API Local Mode** (using local FFmpeg, MediaPipe face tracking, and local/YouTube VTT subtitles at $0.00 cost) while supporting 6 premier cloud AI providers (OpenAI, Groq, Google Gemini, Anthropic, Deepgram, and Replicate).

## Goals
1. **Sweet Spot Retention (40–60 Seconds)**: Curate and render complete, high-impact narrative clips with strong hooks and definitive payoffs without filler.
2. **AI Face Tracking (MediaPipe + Haar Cascade)**: Continuously center the speaker inside the 9:16 vertical crop canvas with smooth camera panning.
3. **World-Class Visuals & Kinetic Typography**: Word-by-word highlighted captions with pill badges (`hormozi_badge`, `mrbeast`, `neon`), 120% punch-in zooms every 3.2s, and top hook curiosity banners.
4. **Foley Sound Design**: Beat-synced whooshes on cuts/zooms, pops on subtitle beats, and low-frequency bass impacts on hooks.
5. **Turbo Encoding Speed**: 6X faster rendering with `-preset ultrafast` and multi-threaded FFmpeg encoding (~6-8s per short).

## Core User Flow
1. **Analyze Long Video**: Ingests video URL/file, transcribes speech, evaluates retention potential (0-100 score), and identifies 3-5 top moments with hook lines.
2. **Batch Render Shorts**: In a single tool call (`batch_generate_shorts`), cuts, auto-reframes to 9:16 with face tracking, generates ASS captions, mixes Foley SFX, and exports ready-to-post MP4s.
3. **Export Metadata**: Automatically writes 3 platform-tailored post captions (TikTok, Reels, Shorts), 5 hashtags, and title for every generated short.

## Features
- **Zero-API Local Mode**: 100% free operation using local FFmpeg and MediaPipe.
- **AI Face Tracking**: Dynamic center speaker tracking with EMA smoothing.
- **Kinetic Subtitles**: Word-by-word highlighted captions with pill badges (`hormozi_badge`, `mrbeast`, `neon`).
- **Turbo FFmpeg Pipeline**: 1080x1920 30fps vertical video rendering in under 10 seconds.
- **Viral Metadata Generator**: Platform-tailored hooks, descriptions, and hashtag clusters.
- **Standard MCP Interface**: Stdio-based Model Context Protocol server compatible with Cursor, Claude, Windsurf, Antigravity.

## Scope
### In Scope
- YouTube and direct video downloading (`yt-dlp` integration with auto-subs extraction)
- Local and cloud AI transcription (Groq Whisper, OpenAI Whisper, Deepgram, Replicate)
- Continuous MediaPipe AI face tracking with exponential moving average (EMA) smoothing
- ASS kinetic karaoke subtitles with pill badges and emoji pop
- Turbo FFmpeg 1080x1920 30fps vertical MP4 export
- MCP Server interface on stdio for Cursor, Claude Desktop, Antigravity, and any MCP client

### Out of Scope
- Direct social media publishing (handled by separate distribution tools)
- Heavy manual non-linear timeline editing (handled automatically via smart heuristics)

## Success Criteria
1. Any long YouTube URL or MP4 converts into a 1080x1920 9:16 vertical short in <20s.
2. Speaker's face remains centered at all times regardless of stage movement.
3. Word-by-word kinetic captions are always visible and synchronized with speech.
4. Operates without any API key in Zero-API Local Mode.
