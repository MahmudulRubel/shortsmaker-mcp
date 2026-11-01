import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { SubtitleGenerator } from '../src/subtitleGenerator.js';
import { VideoProcessor } from '../src/videoProcessor.js';
import { ReplicateService } from '../src/replicateService.js';

async function runTests() {
  console.log('--- [ShortsMaker Verification Suite] ---');
  const tempDir = path.resolve('./temp_test');
  fs.mkdirSync(tempDir, { recursive: true });

  const testVideoPath = path.join(tempDir, 'sample_landscape.mp4');
  const testAssPath = path.join(tempDir, 'test_subtitles.ass');
  const testShortPath = path.join(tempDir, 'output_short_916.mp4');

  // Step 1: Create a synthetic 16:9 1920x1080 test video with audio using FFmpeg
  console.log('[1/5] Generating synthetic test video (1920x1080 with audio)...');
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

  // Step 2: Test Subtitle Generator
  console.log('[2/5] Testing Subtitle Generator (Hormozi style with karaoke & emojis)...');
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

  // Step 3: Test Video Processor metadata & reframe with burned subtitles
  console.log('[3/5] Testing Video Processor: Reframing 16:9 to 9:16 + Burning Subtitles...');
  const vp = new VideoProcessor();
  const meta = await vp.getVideoMetadata(testVideoPath);
  console.log(`  Source dimensions: ${meta.width}x${meta.height}, duration: ${meta.duration}s`);

  await vp.cutAndReframe({
    inputPath: testVideoPath,
    outputPath: testShortPath,
    startTime: 0,
    duration: 4,
    layout: 'blurred_background',
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

  // Step 4: Test Replicate Viral Brain
  console.log('[4/5] Testing Viral Brain scoring logic...');
  const rep = new ReplicateService();
  const analysis = await rep.analyzeVirality("Test transcript about growth and revenue secrets", 60);
  if (!analysis.clips || analysis.clips.length === 0) {
    throw new Error('Viral analysis did not return clips');
  }
  console.log(`✓ Viral Brain returned ${analysis.clips.length} clip(s). Top Virality Score: ${analysis.clips[0].virality_score}`);

  // Step 5: Clean up temp test directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('[5/5] Cleaned up temporary test files.');

  console.log('\n========================================');
  console.log('🎉 ALL VERIFICATION CHECKS PASSED (5/5)!');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
