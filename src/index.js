#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import { AIProviderService } from './aiProviderService.js';
import { VideoProcessor } from './videoProcessor.js';
import { SubtitleGenerator } from './subtitleGenerator.js';
import { VideoDownloader } from './downloader.js';
import { SmartPacing } from './smartPacing.js';

dotenv.config();

const server = new Server(
  {
    name: 'shortsmaker-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const aiProvider = new AIProviderService();
const videoProcessor = new VideoProcessor();
const storageDir = path.resolve('./storage');

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
              description: 'Target duration in seconds for each short (default: 35)',
              default: 35,
            },
            ai_provider: AI_PROVIDER_PROPERTY,
          },
          required: ['video_path_or_url'],
        },
      },
      {
        name: 'create_short_clip',
        description:
          'Cuts a video segment, reframes to 9:16 vertical (viral fullscreen punch, blurred background, or smart crop), generates kinetic animated karaoke subtitles with hook banner, places beat-synced SFX (whooshes, pops, bass impacts), and renders a polished viral short.',
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
              description: 'Duration in seconds (e.g. 30)',
              default: 30,
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
          '10X Master Batch Engine: Ingests a long video, automatically identifies the top 3-5 viral moments, reframes to 9:16 vertical, applies dynamic punch-in zooms, generates animated kinetic subtitles with hook banners, mixes beat-synced SFX (whooshes, pops, bass impacts), and exports all ready-to-post viral shorts with titles, captions, and hashtags in a single call.',
        inputSchema: {
          type: 'object',
          properties: {
            video_path_or_url: {
              type: 'string',
              description: 'Path or URL of the long video',
            },
            count: {
              type: 'number',
              description: 'Number of viral shorts to produce (default: 3, max: 5)',
              default: 3,
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

      case 'analyze_long_video': {
        const localVideo = await VideoDownloader.resolveSource(args.video_path_or_url);
        const metadata = await videoProcessor.getVideoMetadata(localVideo);
        const audioPath = path.join(storageDir, 'audio', `audio_${runId}.mp3`);
        await videoProcessor.extractAudio(localVideo, audioPath);

        const transcription = await aiProvider.transcribeAudio(audioPath, {
          provider: args.ai_provider,
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
        const duration = Number(args.duration) || 30;
        const layout = args.layout || 'viral_fullscreen_punch';
        const captionStyle = args.caption_style || 'hormozi';
        const enableCaptions = args.enable_captions !== false;
        const enableSFX = args.enable_sfx !== false;

        let subtitlesPath = null;
        let subtitleBeats = [];

        if (enableCaptions) {
          const audioPath = path.join(storageDir, 'audio', `clip_${runId}.mp3`);
          await videoProcessor.extractAudio(localVideo, audioPath);
          const transcription = await aiProvider.transcribeAudio(audioPath, {
            provider: args.ai_provider,
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
        const duration = bestClip.duration || 30;
        const captionStyle = args.caption_style || 'hormozi';
        const layout = args.layout || 'viral_fullscreen_punch';

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
        const count = Math.min(Math.max(Number(args.count) || 3, 1), 5);
        const captionStyle = args.caption_style || 'hormozi';
        const layout = args.layout || 'viral_fullscreen_punch';

        const metadata = await videoProcessor.getVideoMetadata(localVideo);
        const audioPath = path.join(storageDir, 'audio', `batch_${runId}.mp3`);
        await videoProcessor.extractAudio(localVideo, audioPath);

        const transcription = await aiProvider.transcribeAudio(audioPath, {
          provider: args.ai_provider,
        });
        const analysis = await aiProvider.analyzeVirality(transcription, metadata.duration, {
          provider: args.ai_provider,
        });

        const selectedClips = (analysis.clips || []).slice(0, count);
        if (selectedClips.length === 0) {
          selectedClips.push({
            start_time: 0,
            duration: 30,
            headline: 'Viral Moment',
            virality_score: 95,
            hook_line: 'Watch this incredible moment unfold!',
          });
        }

        const generatedShorts = [];

        for (let i = 0; i < selectedClips.length; i++) {
          const clip = selectedClips[i];
          const startTime = clip.start_time;
          const duration = clip.duration || 30;
          const clipIndex = i + 1;

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
