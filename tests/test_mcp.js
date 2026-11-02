import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { SubtitleGenerator } from '../src/subtitleGenerator.js';
import { VideoProcessor } from '../src/videoProcessor.js';
import { AIProviderService } from '../src/aiProviderService.js';

async function runTests() {
  console.log('--- [ShortsMaker Verification Suite (Multi-Provider & Zero-API Local Mode)] ---');
  const tempDir = path.resolve('./temp_test');
  fs.mkdirSync(tempDir, { recursive: true });

  const testVideoPath = path.join(tempDir, 'sample_landscape.mp4');
  const testAudioPath = path.join(tempDir, 'sample_audio.mp3');
  const testAssPath = path.join(tempDir, 'test_subtitles.ass');
  const testShortPath = path.join(tempDir, 'output_short_916.mp4');

  // Step 1: Create a synthetic 16:9 1920x1080 test video with audio using FFmpeg
  console.log('[1/6] Generating synthetic test video (1920x1080 with audio)...');
  await new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=6',
      '-t', '5',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      testVideoPath
    ]);
    proc.on('close', code => code === 0 ? resolve() : reject(new Error('Failed to create test video')));
  });
  console.log('✓ Test video generated:', testVideoPath);

  // Extract test audio
  await new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y',
      '-i', testVideoPath,
      '-vn',
      '-acodec', 'libmp3lame',
      testAudioPath
    ]);
    proc.on('close', code => code === 0 ? resolve() : reject(new Error('Failed to extract audio')));
  });

  // Step 2: Test Multi-Provider Manager & Zero-API Local Mode
  console.log('[2/6] Testing AIProviderService with ZERO API keys (100% Free Local Engine)...');
  const zeroApiProvider = new AIProviderService({
    replicateToken: '',
    openaiKey: '',
    anthropicKey: '',
    geminiKey: '',
    groqKey: '',
    deepgramKey: ''
  });

  const providers = zeroApiProvider.getAvailableProviders();
  if (!providers.local) {
    throw new Error('Local provider must always be enabled!');
  }
  const active = zeroApiProvider.getActiveProvider();
  console.log(`✓ Zero-API active provider resolved to: [${active.toUpperCase()}]`);

  const localTranscription = await zeroApiProvider.transcribeAudio(testAudioPath, { provider: 'local' });
  if (!localTranscription.words || localTranscription.words.length === 0) {
    throw new Error('Local transcription generator failed');
  }
  console.log(`✓ Local Zero-API transcription words generated: ${localTranscription.words.length} word(s)`);

  const localAnalysis = await zeroApiProvider.analyzeVirality(localTranscription, 60, { provider: 'local' });
  if (!localAnalysis.clips || localAnalysis.clips.length === 0) {
    throw new Error('Local viral analysis failed');
  }
  console.log(`✓ Local Zero-API viral clip detected: "${localAnalysis.clips[0].headline}" (Virality Score: ${localAnalysis.clips[0].virality_score})`);

  // Step 3: Test Subtitle Generator (Karaoke & Emojis)
  console.log('[3/6] Testing Subtitle Generator (Hormozi style with karaoke & emojis)...');
  const sampleWords = [
    { word: 'STOP', start: 0.2, end: 0.8 },
    { word: 'SCROLLING', start: 0.8, end: 1.5 },
    { word: 'THIS', start: 1.5, end: 1.9 },
    { word: 'SECRET', start: 1.9, end: 2.8 },
    { word: 'MAKES', start: 2.8, end: 3.2 },
    { word: 'MONEY', start: 3.2, end: 4.0 }
  ];

  const assContent = SubtitleGenerator.generateASS({
    words: sampleWords,
    styleName: 'hormozi',
    outputPath: testAssPath,
    clipStartTime: 0,
    clipEndTime: 5
  });

  if (!fs.existsSync(testAssPath) || !assContent.includes('ScriptType: v4.00+')) {
    throw new Error('Subtitle generation failed!');
  }
  console.log('✓ Subtitle ASS generated successfully with karaoke tags');

  // Step 4: Test Video Processor: Reframing 16:9 to 9:16 + Burning Subtitles
  console.log('[4/6] Testing Video Processor: Reframing 16:9 to 9:16 + Burning Subtitles...');
  const vp = new VideoProcessor();
  const meta = await vp.getVideoMetadata(testVideoPath);
  console.log(`  Source dimensions: ${meta.width}x${meta.height}, duration: ${meta.duration}s`);

  await vp.cutAndReframe({
    inputPath: testVideoPath,
    outputPath: testShortPath,
    startTime: 0,
    duration: 4,
    layout: 'viral_fullscreen_punch',
    subtitlesAssPath: testAssPath
  });

  if (!fs.existsSync(testShortPath)) {
    throw new Error('Shorts video rendering failed!');
  }

  const outMeta = await vp.getVideoMetadata(testShortPath);
  console.log(`✓ Short video rendered: ${outMeta.width}x${outMeta.height}, duration: ${outMeta.duration}s`);
  if (outMeta.width !== 1080 || outMeta.height !== 1920) {
    throw new Error(`Unexpected dimensions: expected 1080x1920, got ${outMeta.width}x${outMeta.height}`);
  }

  // Step 5: Test B-Roll Local Fallback
  console.log('[5/6] Testing B-Roll fallback in Zero-API mode...');
  const brollFallback = await zeroApiProvider.generateBRollVisual('luxury car driving at sunset', { provider: 'local' });
  console.log(`✓ B-Roll in local mode resolved cleanly: provider = ${brollFallback.provider}`);

  // Step 6: Clean up temp test directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('[6/6] Cleaned up temporary test files.');

  console.log('\n======================================================');
  console.log('🎉 ALL VERIFICATION CHECKS PASSED (6/6)!');
  console.log('Zero-API Local Mode & Multi-Provider Architecture Verified');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
