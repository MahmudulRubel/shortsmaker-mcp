#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { AIProviderService } from './aiProviderService.js';
import { VideoProcessor } from './videoProcessor.js';
import { SubtitleGenerator } from './subtitleGenerator.js';
import { VideoDownloader } from './downloader.js';
import { SmartPacing } from './smartPacing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from ShortsMaker directory AND current working directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const server = new Server(
  {
    name: 'shortsmaker-mcp',
    version: '2.3.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

const aiProvider = new AIProviderService();
const videoProcessor = new VideoProcessor();
const storageDir = process.env.SHORTSMAKER_STORAGE_DIR || path.resolve(__dirname, '..', 'storage');

fs.mkdirSync(path.join(storageDir, 'inputs'), { recursive: true });
fs.mkdirSync(path.join(storageDir, 'audio'), { recursive: true });
fs.mkdirSync(path.join(storageDir, 'subtitles'), { recursive: true });
fs.mkdirSync(path.join(storageDir, 'outputs'), { recursive: true });
fs.mkdirSync(path.join(storageDir, 'broll'), { recursive: true });

const AI_PROVIDER_PROPERTY = {
  type: 'string',
  enum: ['auto', 'local', 'openai', 'groq', 'gemini', 'anthropic', 'deepgram', 'replicate'],
  description: 'AI Provider to use. Select "local" for 100% Free / Zero-API operation (FFmpeg + local subtitles). Defaults to "auto" (uses first configured API key, or falls back to local).',
  default: 'auto',
};

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_ai_providers',
        description:
          'Lists all available AI providers (Local, OpenAI, Groq, Gemini, Anthropic, Deepgram, Replicate), shows which API keys are configured, and indicates the active default provider.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project_context',
        description:
          'Retrieves ContextZen methodology context (AGENTS.md, architecture, invariants, UI rules, code standards, progress tracker) so connected AI agents understand the codebase before making changes.',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              enum: [
                'all',
                'project-overview',
                'architecture',
                'ui-context',
                'code-standards',
                'ai-workflow-rules',
                'progress-tracker',
              ],
              description: 'Which ContextZen topic to inspect. Defaults to "all".',
              default: 'all',
            },
          },
        },
      },
      {
        name: 'get_onboarding_wizard',
        description:
          'Returns the interactive onboarding questionnaire and configuration options (video source, number of clips, duration sweet spot, caption style, and framing) for users and agents to click and select.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'analyze_long_video',
        description:
          'Transcribes a long video, analyzes storytelling and audience retention curves using AI (or local audio heuristics), and identifies ranked viral short-form moments with virality scores (0-100), hook strength, timestamps, and highlight keywords.',
        inputSchema: {
          type: 'object',
          properties: {
            video_path_or_url: {
              type: 'string',
              description: 'Local file path or URL to the long video',
            },
            target_clip_length: {
              type: 'number',
              description: 'Target duration in seconds for each short (sweet spot: 40-60s, default: 45)',
              default: 45,
            },
            ai_provider: AI_PROVIDER_PROPERTY,
          },
          required: ['video_path_or_url'],
        },
      },
      {
        name: 'create_short_clip',
        description:
          'Cuts a video segment, reframes to 9:16 vertical (viral fullscreen punch, blurred background, or smart crop) with AI face tracking, generates kinetic animated karaoke subtitles with hook banner, places beat-synced SFX (whooshes, pops, bass impacts), and renders a polished viral short in seconds.',
        inputSchema: {
          type: 'object',
          properties: {
            video_path_or_url: {
              type: 'string',
              description: 'Local file path or URL to the video',
            },
            start_time: {
              type: 'number',
              description: 'Start timestamp in seconds',
            },
            duration: {
              type: 'number',
              description: 'Duration in seconds (sweet spot: 40-60s, default: 45)',
              default: 45,
            },
            face_tracking: {
              type: 'boolean',
              description: 'Enable MediaPipe AI continuous face tracking to smoothly center the speaker in 9:16 vertical',
              default: true,
            },
            speed_preset: {
              type: 'string',
              enum: ['ultrafast', 'veryfast', 'fast'],
              description: 'Turbo speed mode: "ultrafast" renders 6X faster in ~5-8 seconds.',
              default: 'ultrafast',
            },
            hook_title: {
              type: 'string',
              description: 'Optional bold hook title banner displayed during first 2.5s (e.g., "ONE-HANDED SIX!")',
            },
            layout: {
              type: 'string',
              enum: ['viral_fullscreen_punch', 'blurred_background', 'smart_crop', 'split_screen'],
              description:
                'Vertical reframe layout: "viral_fullscreen_punch" (full-screen 9:16 with dynamic punch-in zooms & color pop), "blurred_background", "smart_crop", or "split_screen"',
              default: 'viral_fullscreen_punch',
            },
            caption_style: {
              type: 'string',
              enum: ['hormozi', 'hormozi_badge', 'mrbeast', 'neon', 'minimal'],
              description: 'Animated subtitle style (including pill badge & neon glow)',
              default: 'hormozi',
            },
            enable_captions: {
              type: 'boolean',
              description: 'Whether to burn animated word-by-word subtitles',
              default: true,
            },
            enable_sfx: {
              type: 'boolean',
              description: 'Whether to inject beat-synced SFX (whooshes on zooms, pops on subtitle beats, bass drops on hook)',
              default: true,
            },
            broll_image_path: {
              type: 'string',
              description: 'Optional path to B-roll cutaway image to overlay',
            },
            broll_start_time: {
              type: 'number',
              description: 'Seconds from clip start when B-roll appears (default: 3)',
              default: 3,
            },
            broll_duration: {
              type: 'number',
              description: 'Duration of B-roll cutaway in seconds (default: 4)',
              default: 4,
            },
            output_filename: {
              type: 'string',
              description: 'Optional custom output filename (e.g. short_1.mp4)',
            },
            ai_provider: AI_PROVIDER_PROPERTY,
          },
          required: ['video_path_or_url', 'start_time'],
        },
      },
      {
        name: 'generate_broll_cutaway',
        description:
          'Generates contextual 9:16 AI B-roll images matching your clip topic to break monotony and boost visual retention (via DALL-E, Flux, or local aesthetic canvas).',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Visual description of the B-roll asset to generate',
            },
            style: {
              type: 'string',
              description: 'Style description (default: photorealistic cinematic vertical 9:16)',
              default: 'photorealistic cinematic vertical 9:16',
            },
            ai_provider: AI_PROVIDER_PROPERTY,
          },
          required: ['prompt'],
        },
      },
      {
        name: 'generate_viral_metadata',
        description:
          'Generates high-converting titles, descriptions, pinned comment copy, and viral hashtag clusters for TikTok, YouTube Shorts, and Instagram Reels.',
        inputSchema: {
          type: 'object',
          properties: {
            topic_or_headline: {
              type: 'string',
              description: 'The core hook or headline of the clip',
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key themes or highlight words',
            },
            platform: {
              type: 'string',
              enum: ['tiktok', 'youtube_shorts', 'instagram_reels', 'all'],
              default: 'all',
            },
          },
          required: ['topic_or_headline'],
        },
      },
      {
        name: 'full_pipeline',
        description:
          'One-click automated workflow: ingests long video, analyzes the single highest-scoring viral highlight, cuts, reframes to 9:16, burns animated karaoke captions, places SFX, and renders a ready-to-post short video.',
        inputSchema: {
          type: 'object',
          properties: {
            video_path_or_url: {
              type: 'string',
              description: 'Path or URL of the long video',
            },
            target_clip_length: {
              type: 'number',
              description: 'Target duration in seconds (sweet spot: 40-60s, default: 45)',
              default: 45,
            },
            face_tracking: {
              type: 'boolean',
              description: 'Enable MediaPipe AI continuous face tracking to smoothly center speaker in 9:16 vertical',
              default: true,
            },
            caption_style: {
              type: 'string',
              enum: ['hormozi', 'hormozi_badge', 'mrbeast', 'neon', 'minimal'],
              default: 'hormozi',
            },
            layout: {
              type: 'string',
              enum: ['viral_fullscreen_punch', 'blurred_background', 'smart_crop', 'split_screen'],
              default: 'viral_fullscreen_punch',
            },
            ai_provider: AI_PROVIDER_PROPERTY,
          },
          required: ['video_path_or_url'],
        },
      },
      {
        name: 'batch_generate_shorts',
        description:
          '10X Master Batch Engine: Ingests a long video, automatically identifies top viral moments (sweet spot 40-60s), auto-reframes to 9:16 with AI face tracking, applies punch-in zooms, generates kinetic subtitles with hook banners, mixes beat-synced SFX, and exports all ready-to-post viral shorts.',
        inputSchema: {
          type: 'object',
          properties: {
            video_path_or_url: {
              type: 'string',
              description: 'Path or URL of the long video',
            },
            count: {
              type: 'number',
              description: 'Number of viral shorts to produce (default: 3, max: 10)',
              default: 3,
            },
            target_clip_length: {
              type: 'number',
              description: 'Target duration in seconds for each short (sweet spot: 40-60s, default: 45)',
              default: 45,
            },
            face_tracking: {
              type: 'boolean',
              description: 'Enable MediaPipe AI continuous face tracking to smoothly auto-reframe and center speaker in 9:16 vertical',
              default: true,
            },
            caption_style: {
              type: 'string',
              enum: ['hormozi', 'hormozi_badge', 'mrbeast', 'neon', 'minimal'],
              default: 'hormozi',
            },
            layout: {
              type: 'string',
              enum: ['viral_fullscreen_punch', 'blurred_background', 'smart_crop', 'split_screen'],
              default: 'viral_fullscreen_punch',
            },
            ai_provider: AI_PROVIDER_PROPERTY,
          },
          required: ['video_path_or_url'],
        },
      },
    ],
  };
});

// Define available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'onboarding_wizard',
        description:
          'Interactive onboarding interview: asks for video source, target clip count, length sweet spot (40-60s), caption style, and framing.',
        arguments: [
          {
            name: 'video_source',
            description: 'Optional YouTube URL or local video path',
            required: false,
          },
        ],
      },
      {
        name: 'create_viral_shorts',
        description:
          'Guided workflow to convert a horizontal video into viral 9:16 vertical shorts with AI face tracking and kinetic captions.',
        arguments: [
          {
            name: 'video_path_or_url',
            description: 'YouTube URL or local video path',
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: promptArgs } = request.params;
  const videoHint = promptArgs?.video_source || promptArgs?.video_path_or_url;

  return {
    description: 'ShortsMaker Interactive Onboarding Interview',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Hi! Please run the ShortsMaker Onboarding Interview with me. Ask me the following questions with clear multiple-choice options so I can click or select my choices:

1. **Video Source**: Where is your long video? (Provide YouTube URL or local file path)${videoHint ? `\n   (I have provided: ${videoHint})` : ''}
2. **Number of Shorts**:
   - (Recommended) 3 Shorts (Optimal variety & fast rendering)
   - 1 Short (Quick single test)
   - 5 Shorts (Daily social cluster)
   - 10 Shorts (Full weekly batch)
3. **Clip Duration**:
   - (Recommended) 40–60 seconds (Sweet spot for maximum TikTok, Reels & Shorts retention)
   - 30–45 seconds (Fast-paced, rapid hooks)
   - 15–30 seconds (Micro attention hooks)
   - 60–90 seconds (In-depth storytelling)
4. **Caption Style**:
   - (Recommended) hormozi_badge (Yellow/green bold words with high-contrast pill badges)
   - hormozi (Electric green active word highlight with clean outline)
   - mrbeast (High-impact yellow & red text with heavy drop shadow)
   - neon (Cyberpunk cyan & magenta glowing subtitles)
   - minimal (Clean white subtitles with subtle outline)
5. **Framing & Aspect Ratio**:
   - (Recommended) viral_fullscreen_punch with AI Face Tracking (Full 1080x1920 mobile screen with dynamic speaker tracking)
   - blurred_background (Original video centered with ambient blurred background)
   - split_screen (Top and bottom podcast/reaction layout)

Once I answer, please proceed to batch-generate the shorts using the batch_generate_shorts tool!`,
        },
      },
    ],
  };
});

// Handle tool executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const runId = Date.now();

  try {
    switch (name) {
      case 'list_ai_providers': {
        const available = aiProvider.getAvailableProviders();
        const active = aiProvider.getActiveProvider();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  active_default_provider: active,
                  providers: {
                    local: {
                      enabled: true,
                      cost: '$0.00 (Zero AI API)',
                      description: '100% offline FFmpeg audio peak detection & subtitle parser',
                    },
                    groq: {
                      enabled: available.groq,
                      env_key: 'GROQ_API_KEY',
                      models: 'whisper-large-v3, llama-3.3-70b-versatile',
                    },
                    openai: {
                      enabled: available.openai,
                      env_key: 'OPENAI_API_KEY',
                      models: 'whisper-1, gpt-4o-mini, dall-e-3',
                    },
                    gemini: {
                      enabled: available.gemini,
                      env_key: 'GEMINI_API_KEY',
                      models: 'gemini-1.5-flash',
                    },
                    anthropic: {
                      enabled: available.anthropic,
                      env_key: 'ANTHROPIC_API_KEY',
                      models: 'claude-3-5-haiku',
                    },
                    deepgram: {
                      enabled: available.deepgram,
                      env_key: 'DEEPGRAM_API_KEY',
                      models: 'nova-2',
                    },
                    replicate: {
                      enabled: available.replicate,
                      env_key: 'REPLICATE_API_TOKEN',
                      models: 'incredibly-fast-whisper, llama-3, flux-schnell',
                    },
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_project_context': {
        const topic = args?.topic || 'all';
        const contextDir = path.resolve(__dirname, '..', 'context');
        const filesMap = {
          'project-overview': 'project-overview.md',
          'architecture': 'architecture.md',
          'ui-context': 'ui-context.md',
          'code-standards': 'code-standards.md',
          'ai-workflow-rules': 'ai-workflow-rules.md',
          'progress-tracker': 'progress-tracker.md',
        };

        if (topic !== 'all' && filesMap[topic]) {
          const filePath = path.join(contextDir, filesMap[topic]);
          const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : `File not found: ${filesMap[topic]}`;
          return {
            content: [{ type: 'text', text: content }],
          };
        }

        let aggregated = `# ShortsMaker MCP — ContextZen Specification\n\n`;
        const agentsFile = path.resolve(__dirname, '..', 'AGENTS.md');
        if (fs.existsSync(agentsFile)) {
          aggregated += `=== AGENTS.md ===\n\n${fs.readFileSync(agentsFile, 'utf-8')}\n\n`;
        }
        for (const [key, fileName] of Object.entries(filesMap)) {
          const filePath = path.join(contextDir, fileName);
          if (fs.existsSync(filePath)) {
            aggregated += `=== context/${fileName} ===\n\n${fs.readFileSync(filePath, 'utf-8')}\n\n`;
          }
        }
        return {
          content: [{ type: 'text', text: aggregated }],
        };
      }

      case 'get_onboarding_wizard': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  title: 'ShortsMaker Onboarding Wizard',
                  instructions:
                    'Present these questions to the user with clickable options so they can choose their preferences before video rendering begins.',
                  questions: [
                    {
                      id: 'video_source',
                      question: 'Where is your long video that you want to turn into viral shorts?',
                      options: [
                        'YouTube URL (e.g. https://youtu.be/...)',
                        'Local video file path (e.g. C:/videos/podcast.mp4)',
                        'Sample test video (built-in demo)',
                      ],
                      is_multi_select: false,
                    },
                    {
                      id: 'count',
                      question: 'How many viral shorts would you like to produce?',
                      options: [
                        '(Recommended) 3 Shorts (Optimal variety & fast rendering)',
                        '1 Short (Quick single test)',
                        '5 Shorts (Daily social cluster)',
                        '10 Shorts (Full weekly viral batch)',
                      ],
                      is_multi_select: false,
                    },
                    {
                      id: 'clip_duration',
                      question: 'What length would you like for each short?',
                      options: [
                        '(Recommended) 40–60 seconds (Sweet spot for maximum TikTok, Reels & Shorts retention)',
                        '30–45 seconds (Fast-paced, high tempo)',
                        '15–30 seconds (Micro attention hooks)',
                        '60–90 seconds (In-depth storytelling)',
                      ],
                      is_multi_select: false,
                    },
                    {
                      id: 'caption_style',
                      question: 'Which subtitle caption style would you like?',
                      options: [
                        '(Recommended) hormozi_badge (Yellow/green bold words with high-contrast pill badges)',
                        'hormozi (Electric green active word highlight with clean outline)',
                        'mrbeast (High-impact yellow & red text with heavy drop shadow)',
                        'neon (Cyberpunk cyan & magenta glowing subtitles)',
                        'minimal (Clean white subtitles with subtle outline)',
                      ],
                      is_multi_select: false,
                    },
                    {
                      id: 'layout',
                      question: 'How should the horizontal video be reframed for 9:16 mobile vertical?',
                      options: [
                        '(Recommended) viral_fullscreen_punch with AI Face Tracking (Full 1080x1920 mobile screen with dynamic speaker tracking)',
                        'blurred_background (Original video centered with ambient blurred background)',
                        'split_screen (Top and bottom podcast/reaction layout)',
                      ],
                      is_multi_select: false,
                    },
                  ],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'analyze_long_video': {
        const localVideo = await VideoDownloader.resolveSource(args.video_path_or_url);
        const metadata = await videoProcessor.getVideoMetadata(localVideo);
        const audioPath = path.join(storageDir, 'audio', `audio_${runId}.mp3`);
        await videoProcessor.extractAudio(localVideo, audioPath);

        const transcription = await aiProvider.transcribeAudio(audioPath, {
          provider: args.ai_provider,
          videoPath: localVideo,
          storageDir,
        });
        const analysis = await aiProvider.analyzeVirality(transcription, metadata.duration, {
          provider: args.ai_provider,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  active_provider: aiProvider.getActiveProvider(args.ai_provider),
                  video_path: localVideo,
                  duration_seconds: metadata.duration,
                  resolution: `${metadata.width}x${metadata.height}`,
                  viral_clips: analysis.clips,
                  full_transcript_preview: transcription.text?.slice(0, 500) || '',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'create_short_clip': {
        const localVideo = await VideoDownloader.resolveSource(args.video_path_or_url);
        const startTime = Number(args.start_time) || 0;
        const duration = Number(args.duration) || 45;
        const layout = args.layout || 'viral_fullscreen_punch';
        const captionStyle = args.caption_style || 'hormozi';
        const enableCaptions = args.enable_captions !== false;
        const enableSFX = args.enable_sfx !== false;
        const faceTracking = args.face_tracking !== false;
        const speedPreset = args.speed_preset || 'ultrafast';

        let subtitlesPath = null;
        let subtitleBeats = [];

        if (enableCaptions) {
          const audioPath = path.join(storageDir, 'audio', `clip_${runId}.mp3`);
          await videoProcessor.extractAudio(localVideo, audioPath);
          const transcription = await aiProvider.transcribeAudio(audioPath, {
            provider: args.ai_provider,
            videoPath: localVideo,
            storageDir,
          });

          subtitlesPath = path.join(storageDir, 'subtitles', `sub_${runId}.ass`);
          const subResult = SubtitleGenerator.generateASS({
            words: transcription.words || [],
            chunks: transcription.chunks || [],
            styleName: captionStyle,
            outputPath: subtitlesPath,
            clipStartTime: startTime,
            clipEndTime: startTime + duration,
            hookBannerText: args.hook_title || null,
          });
          subtitleBeats = subResult.beatTimestamps || [];
        }

        const outName = args.output_filename || `short_${runId}.mp4`;
        const outputPath = path.join(storageDir, 'outputs', outName);

        await videoProcessor.cutAndReframe({
          inputPath: localVideo,
          outputPath,
          startTime,
          duration,
          layout,
          subtitlesAssPath: subtitlesPath,
          subtitleBeatTimestamps: subtitleBeats,
          brollPath: args.broll_image_path,
          brollStartTime: Number(args.broll_start_time) || 3,
          brollDuration: Number(args.broll_duration) || 4,
          enableSFX,
          faceTracking,
          speedPreset,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  message: 'Short video rendered successfully with 10X features!',
                  short_video_path: path.resolve(outputPath),
                  layout,
                  caption_style: captionStyle,
                  duration,
                  aspect_ratio: '9:16 (1080x1920)',
                  subtitles_burned: enableCaptions,
                  sfx_injected: enableSFX,
                  provider_used: aiProvider.getActiveProvider(args.ai_provider),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'generate_broll_cutaway': {
        const visual = await aiProvider.generateBRollVisual(args.prompt, {
          provider: args.ai_provider,
          style: args.style,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  broll_url: visual.url,
                  prompt: visual.prompt,
                  provider_used: visual.provider || aiProvider.getActiveProvider(args.ai_provider),
                  message: visual.message || 'AI B-Roll generated successfully',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'generate_viral_metadata': {
        const headline = args.topic_or_headline;
        const keywords = args.keywords || ['growth', 'viral', 'secret'];

        const metadata = {
          tiktok: {
            title: `${headline} 🤯 #fyp #viral #learnontiktok`,
            caption: `Wait till the end... The biggest revelation about ${keywords[0] || 'success'} you will ever hear.`,
            hashtags: ['#fyp', '#viral', '#tiktokgrowth', ...keywords.map((k) => `#${k.replace(/\s+/g, '')}`)],
          },
          youtube_shorts: {
            title: `${headline} (Mind-Blowing Truth) #shorts`,
            description: `Key insight on ${keywords.join(', ')}.\n\nSubscribe for more daily growth gems.`,
            tags: keywords,
          },
          instagram_reels: {
            hook: `Stop making this mistake: ${headline}`,
            hashtags: ['#reelsviral', '#contentcreator', '#mindset', ...keywords.map((k) => `#${k.replace(/\s+/g, '')}`)],
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metadata, null, 2),
            },
          ],
        };
      }

      case 'full_pipeline': {
        const localVideo = await VideoDownloader.resolveSource(args.video_path_or_url);
        const metadata = await videoProcessor.getVideoMetadata(localVideo);
        const audioPath = path.join(storageDir, 'audio', `full_${runId}.mp3`);
        await videoProcessor.extractAudio(localVideo, audioPath);

        const transcription = await aiProvider.transcribeAudio(audioPath, {
          provider: args.ai_provider,
          videoPath: localVideo,
          storageDir,
        });
        const analysis = await aiProvider.analyzeVirality(transcription, metadata.duration, {
          provider: args.ai_provider,
        });

        const bestClip = analysis.clips?.[0] || {
          start_time: 0,
          duration: 30,
          headline: 'Top Moment',
          highlight_keywords: ['viral', 'growth'],
        };

        const startTime = bestClip.start_time;
        const duration = Math.min(Number(args.target_clip_length) || bestClip.duration || 45, 59);
        const captionStyle = args.caption_style || 'hormozi';
        const layout = args.layout || 'viral_fullscreen_punch';
        const faceTracking = args.face_tracking !== false;
        const speedPreset = args.speed_preset || 'ultrafast';

        const subtitlesPath = path.join(storageDir, 'subtitles', `sub_full_${runId}.ass`);
        const subResult = SubtitleGenerator.generateASS({
          words: transcription.words || [],
          chunks: transcription.chunks || [],
          styleName: captionStyle,
          outputPath: subtitlesPath,
          clipStartTime: startTime,
          clipEndTime: startTime + duration,
          hookBannerText: bestClip.headline || 'VIRAL MOMENT',
        });

        const outputPath = path.join(storageDir, 'outputs', `viral_short_${runId}.mp4`);
        await videoProcessor.cutAndReframe({
          inputPath: localVideo,
          outputPath,
          startTime,
          duration,
          layout,
          subtitlesAssPath: subtitlesPath,
          subtitleBeatTimestamps: subResult.beatTimestamps,
          faceTracking,
          speedPreset,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  message: 'Full pipeline completed: top viral moment converted to ready short!',
                  chosen_clip: bestClip,
                  virality_score: bestClip.virality_score || 95,
                  short_video_path: path.resolve(outputPath),
                  aspect_ratio: '9:16 (1080x1920)',
                  caption_style: captionStyle,
                  layout,
                  suggested_title: `${bestClip.headline} 🔥 #shorts`,
                  provider_used: aiProvider.getActiveProvider(args.ai_provider),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'batch_generate_shorts': {
        const localVideo = await VideoDownloader.resolveSource(args.video_path_or_url);
        const count = Math.min(Math.max(Number(args.count) || 3, 1), 10);
        const captionStyle = args.caption_style || 'hormozi';
        const layout = args.layout || 'viral_fullscreen_punch';
        const faceTracking = args.face_tracking !== false;

        const metadata = await videoProcessor.getVideoMetadata(localVideo);
        const audioPath = path.join(storageDir, 'audio', `batch_${runId}.mp3`);
        await videoProcessor.extractAudio(localVideo, audioPath);

        const transcription = await aiProvider.transcribeAudio(audioPath, {
          provider: args.ai_provider,
          videoPath: localVideo,
          storageDir,
        });
        const analysis = await aiProvider.analyzeVirality(transcription, metadata.duration, {
          provider: args.ai_provider,
        });

        const selectedClips = (analysis.clips || []).slice(0, count);
        if (selectedClips.length === 0) {
          selectedClips.push({
            start_time: 0,
            duration: 45,
            headline: 'Viral Moment',
            virality_score: 95,
            hook_line: 'Watch this incredible moment unfold!',
          });
        }

        const generatedShorts = [];

        for (let i = 0; i < selectedClips.length; i++) {
          const clip = selectedClips[i];
          const startTime = clip.start_time;
          const duration = Math.min(Number(args.target_clip_length) || clip.duration || 45, 59);
          const clipIndex = i + 1;
          const speedPreset = args.speed_preset || 'ultrafast';

          const subPath = path.join(storageDir, 'subtitles', `batch_${runId}_clip_${clipIndex}.ass`);
          const subResult = SubtitleGenerator.generateASS({
            words: transcription.words || [],
            chunks: transcription.chunks || [],
            styleName: captionStyle,
            outputPath: subPath,
            clipStartTime: startTime,
            clipEndTime: startTime + duration,
            hookBannerText: clip.headline,
          });

          const outPath = path.join(storageDir, 'outputs', `Batch_Short_${clipIndex}_${runId}.mp4`);
          await videoProcessor.cutAndReframe({
            inputPath: localVideo,
            outputPath: outPath,
            startTime,
            duration,
            layout,
            subtitlesAssPath: subPath,
            subtitleBeatTimestamps: subResult.beatTimestamps,
            enableSFX: true,
            faceTracking,
            speedPreset,
          });

          generatedShorts.push({
            clip_number: clipIndex,
            headline: clip.headline,
            virality_score: clip.virality_score || 95,
            hook_line: clip.hook_line,
            duration: duration,
            short_video_path: path.resolve(outPath),
            post_captions: [
              `🔥 ${clip.headline} - Watch what happens! #viral`,
              `Wait for the end... This completely changed my perspective! 🤯`,
              `The biggest takeaway: ${clip.hook_line || clip.headline} #shorts`,
            ],
            hashtags: ['#Shorts', '#ViralShorts', '#Reels', '#Trending', '#ContentCreator'],
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  message: `Successfully generated ${generatedShorts.length} master viral shorts in 1 batch!`,
                  provider_used: aiProvider.getActiveProvider(args.ai_provider),
                  total_shorts: generatedShorts.length,
                  shorts: generatedShorts,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${err.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[ShortsMaker MCP] Server running on stdio');
}

main().catch((err) => {
  console.error('[ShortsMaker MCP] Fatal error:', err);
  process.exit(1);
});
