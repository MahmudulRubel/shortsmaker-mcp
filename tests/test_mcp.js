import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { SubtitleGenerator } from '../src/subtitleGenerator.js';
import { VideoProcessor } from '../src/videoProcessor.js';
import { AIProviderService } from '../src/aiProviderService.js';
import { SmartPacing } from '../src/smartPacing.js';
import { SFXEngine } from '../src/sfxEngine.js';

async function runTests() {
  console.log('--- [ShortsMaker 10X Master Verification Suite] ---');
  const tempDir = path.resolve('./temp_test');
  fs.mkdirSync(tempDir, { recursive: true });

  const testVideoPath = path.join(tempDir, 'sample_landscape.mp4');
  const testAudioPath = path.join(tempDir, 'sample_audio.mp3');
  const testAssPath = path.join(tempDir, 'test_subtitles.ass');
  const testShortPath = path.join(tempDir, 'output_short_916.mp4');

  // Step 1: Create a synthetic 16:9 1920x1080 test video with audio using FFmpeg
  console.log('[1/7] Generating synthetic test video (1920x1080 with audio)...');
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
  console.log('[2/7] Testing AIProviderService with ZERO API keys (100% Free Local Engine)...');
  const zeroApiProvider = new AIProviderService({
    replicateToken: '',
    openaiKey: '',
    anthropicKey: '',
    geminiKey: '',
    groqKey: '',
    deepgramKey: ''
  });

  const providers = zeroApiProvider.getAvailableProviders();
  if (!providers.local) throw new Error('Local provider must always be enabled!');
  const active = zeroApiProvider.getActiveProvider();
  console.log(`✓ Zero-API active provider resolved to: [${active.toUpperCase()}]`);

  const localTranscription = await zeroApiProvider.transcribeAudio(testAudioPath, { provider: 'local' });
  console.log(`✓ Local Zero-API transcription words: ${localTranscription.words.length} word(s)`);

  const localAnalysis = await zeroApiProvider.analyzeVirality(localTranscription, 60, { provider: 'local' });
  console.log(`✓ Local Zero-API viral clip detected: "${localAnalysis.clips[0].headline}" (Virality Score: ${localAnalysis.clips[0].virality_score})`);

  // Step 3: Test Smart Silence & Jump-Cut Removal
  console.log('[3/7] Testing Smart Silence & Jump-Cut Removal Engine...');
  const silences = await SmartPacing.detectSilences(testAudioPath, { minSilenceDuration: 0.2 });
  const segments = SmartPacing.computeSpeechSegments(silences, 5.0);
  console.log(`✓ SmartPacing computed ${segments.length} speech segment(s)`);

  // Step 4: Test Beat-Synced SFX Foley Engine
  console.log('[4/7] Testing Beat-Synced SFX Foley Engine...');
  const sfxEngine = new SFXEngine();
  const sfxPlan = sfxEngine.buildAudioFilterGraph({
    clipDuration: 4,
    zoomTimestamps: [1.5, 3.0],
    subtitleBeatTimestamps: [0.5, 1.8],
    hasMusic: false
  });
  if (!sfxPlan.filterGraph || !sfxPlan.filterGraph.includes('amix')) {
    throw new Error('SFX filter graph generation failed');
  }
  console.log(`✓ SFX Foley filtergraph built successfully with ${sfxPlan.sfxInputs.length / 2} SFX inputs`);

  // Step 5: Test Kinetic Subtitle Generator with Pill Badge Box
  console.log('[5/7] Testing Kinetic Subtitle Generator (Pill Badge + Bounce Pop)...');
  const sampleWords = [
    { word: 'STOP', start: 0.2, end: 0.8 },
    { word: 'SCROLLING', start: 0.8, end: 1.5 },
    { word: 'SECRET', start: 1.5, end: 2.5 },
    { word: 'REVENUE', start: 2.5, end: 3.5 }
  ];

  const subResult = SubtitleGenerator.generateASS({
    words: sampleWords,
    styleName: 'hormozi_badge',
    outputPath: testAssPath,
    clipStartTime: 0,
    clipEndTime: 4,
    hookBannerText: 'THE 1 SECRET TO WEALTH'
  });

  if (!fs.existsSync(testAssPath) || !subResult.assContent.includes('HookBanner')) {
    throw new Error('Subtitle generation with hook banner failed');
  }
  console.log(`✓ Kinetic ASS generated with Hook Banner & ${subResult.beatTimestamps.length} beat timestamp(s)`);

  // Step 6: Test Video Processor: Full-Screen 9:16 + Zooms + Color Pop + Burned Subtitles + SFX
  console.log('[6/7] Testing Video Processor: 9:16 Reframe + Punch Zooms + SFX Mixing...');
  const vp = new VideoProcessor();
  await vp.cutAndReframe({
    inputPath: testVideoPath,
    outputPath: testShortPath,
    startTime: 0,
    duration: 4,
    layout: 'viral_fullscreen_punch',
    subtitlesAssPath: testAssPath,
    subtitleBeatTimestamps: subResult.beatTimestamps,
    enableSFX: true,
    enableColorPop: true,
    enableZoomPunches: true
  });

  if (!fs.existsSync(testShortPath)) {
    throw new Error('Shorts video rendering failed!');
  }

  const outMeta = await vp.getVideoMetadata(testShortPath);
  console.log(`✓ 10X Short video rendered: ${outMeta.width}x${outMeta.height}, duration: ${outMeta.duration}s`);
  if (outMeta.width !== 1080 || outMeta.height !== 1920) {
    throw new Error(`Unexpected dimensions: expected 1080x1920, got ${outMeta.width}x${outMeta.height}`);
  }

  // Step 7: Clean up temp test directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('[7/7] Cleaned up temporary test files.');

  console.log('\n======================================================');
  console.log('🎉 ALL 7/7 10X VERIFICATION CHECKS PASSED!');
  console.log('Smart Pacing, Foley SFX, Kinetic Subtitles & Batch Ready');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
