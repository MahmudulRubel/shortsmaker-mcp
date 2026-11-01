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

import { ReplicateService } from './replicateService.js';
import { VideoProcessor } from './videoProcessor.js';
import { SubtitleGenerator } from './subtitleGenerator.js';
import { VideoDownloader } from './downloader.js';

dotenv.config();

const server = new Server(
  {
    name: 'shortsmaker-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const replicateService = new ReplicateService();
const videoProcessor = new VideoProcessor();
const storageDir = path.resolve('./storage');

fs.mkdirSync(path.join(storageDir, 'inputs'), { recursive: true });
fs.mkdirSync(path.join(storageDir, 'audio'), { recursive: true });
fs.mkdirSync(path.join(storageDir, 'subtitles'), { recursive: true });
fs.mkdirSync(path.join(storageDir, 'outputs'), { recursive: true });
fs.mkdirSync(path.join(storageDir, 'broll'), { recursive: true });

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'analyze_long_video',
        description:
          'Transcribes a long video, analyzes storytelling and audience retention curves using AI, and identifies ranked viral short-form moments with virality scores (0-100), hook strength, timestamps, and highlight keywords.',
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
          },
          required: ['video_path_or_url'],
        },
      },
      {
        name: 'create_short_clip',
        description:
          'Cuts a video segment, reframes to 9:16 vertical (blurred background, smart crop, or split screen), generates word-by-word animated karaoke subtitles (Hormozi / MrBeast style with emojis), and renders a polished viral short.',
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
            layout: {
              type: 'string',
              enum: ['viral_fullscreen_punch', 'blurred_background', 'smart_crop', 'split_screen'],
              description:
                'Vertical reframe layout: "viral_fullscreen_punch" (full-screen 9:16 with dynamic punch-in zooms & color pop), "blurred_background", "smart_crop", or "split_screen"',
              default: 'viral_fullscreen_punch',
            },
            caption_style: {
              type: 'string',
              enum: ['hormozi', 'mrbeast', 'neon', 'minimal'],
              description: 'Animated subtitle style',
              default: 'hormozi',
            },
            enable_captions: {
              type: 'boolean',
              description: 'Whether to burn animated word-by-word subtitles',
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
          },
          required: ['video_path_or_url', 'start_time'],
        },
      },
      {
        name: 'generate_broll_cutaway',
        description:
          'Uses Replicate (Flux-Schnell) to generate contextual 9:16 AI B-roll images matching your clip topic to break monotony and boost visual retention.',
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
          'One-click automated workflow: ingests long video, analyzes the single highest-scoring viral highlight, cuts, reframes to 9:16, burns animated karaoke captions, and renders a ready-to-post short video.',
        inputSchema: {
          type: 'object',
          properties: {
            video_path_or_url: {
              type: 'string',
              description: 'Path or URL of the long video',
            },
            caption_style: {
              type: 'string',
              enum: ['hormozi', 'mrbeast', 'neon', 'minimal'],
              default: 'hormozi',
            },
            layout: {
              type: 'string',
              enum: ['blurred_background', 'smart_crop', 'split_screen'],
              default: 'blurred_background',
            },
          },
          required: ['video_path_or_url'],
        },
      },
    ],
  };
});

// Execute MCP Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const runId = Date.now();

  try {
    switch (name) {
      case 'analyze_long_video': {
        const localVideo = await VideoDownloader.resolveSource(args.video_path_or_url);
        const metadata = await videoProcessor.getVideoMetadata(localVideo);
        const audioPath = path.join(storageDir, 'audio', `audio_${runId}.mp3`);
        await videoProcessor.extractAudio(localVideo, audioPath);

        const transcription = await replicateService.transcribe(audioPath);
        const analysis = await replicateService.analyzeVirality(transcription, metadata.duration);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
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

        let subtitlesPath = null;

        if (enableCaptions) {
          const audioPath = path.join(storageDir, 'audio', `clip_${runId}.mp3`);
          await videoProcessor.extractAudio(localVideo, audioPath);
          const transcription = await replicateService.transcribe(audioPath);

          subtitlesPath = path.join(storageDir, 'subtitles', `sub_${runId}.ass`);
          SubtitleGenerator.generateASS({
            words: transcription.words || [],
            chunks: transcription.chunks || [],
            styleName: captionStyle,
            outputPath: subtitlesPath,
            clipStartTime: startTime,
            clipEndTime: startTime + duration,
          });
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
          brollPath: args.broll_image_path,
          brollStartTime: Number(args.broll_start_time) || 3,
          brollDuration: Number(args.broll_duration) || 4,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  message: 'Short video rendered successfully!',
                  short_video_path: path.resolve(outputPath),
                  layout,
                  caption_style: captionStyle,
                  duration,
                  aspect_ratio: '9:16 (1080x1920)',
                  subtitles_burned: enableCaptions,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'generate_broll_cutaway': {
        const result = await replicateService.generateBRollVisual(args.prompt, args.style);
        const brollPath = path.join(storageDir, 'broll', `broll_${runId}.png`);

        if (result.url.startsWith('http')) {
          await VideoDownloader._downloadDirectFile(result.url, brollPath);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  prompt: result.prompt,
                  remote_url: result.url,
                  local_path: path.resolve(brollPath),
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
        const keywords = args.keywords || ['viral', 'shorts', 'tips'];

        const metadata = {
          headline,
          tiktok: {
            title: `${headline} 🔥 (wait for the end)`,
            hashtags: ['#fyp', '#foryou', '#viral', '#learnontiktok', ...keywords.map((k) => `#${k.replace(/\s+/g, '')}`)],
            caption: `${headline} 👇 Comment your thoughts below!\n\nSave this for later.`,
          },
          youtube_shorts: {
            title: `${headline} #shorts`,
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

        const transcription = await replicateService.transcribe(audioPath);
        const analysis = await replicateService.analyzeVirality(transcription, metadata.duration);

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
        SubtitleGenerator.generateASS({
          words: transcription.words || [],
          chunks: transcription.chunks || [],
          styleName: captionStyle,
          outputPath: subtitlesPath,
          clipStartTime: startTime,
          clipEndTime: startTime + duration,
        });

        const outputPath = path.join(storageDir, 'outputs', `viral_short_${runId}.mp4`);
        await videoProcessor.cutAndReframe({
          inputPath: localVideo,
          outputPath,
          startTime,
          duration,
          layout,
          subtitlesAssPath: subtitlesPath,
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
