import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class VideoProcessor {
  constructor(ffmpegPath = 'ffmpeg') {
    this.ffmpegPath = ffmpegPath;
    this.sfxDir = path.resolve('./storage/sfx');
    this._ensureSFX();
  }

  /**
   * Generates built-in whoosh and hit sound effects if not already present
   */
  _ensureSFX() {
    fs.mkdirSync(this.sfxDir, { recursive: true });
    const whooshPath = path.join(this.sfxDir, 'whoosh.wav');
    const hitPath = path.join(this.sfxDir, 'hit.wav');

    if (!fs.existsSync(whooshPath)) {
      spawn(this.ffmpegPath, [
        '-y',
        '-f', 'lavfi', '-i', 'anoisesrc=d=0.28:c=white:r=44100,afade=t=in:ss=0:d=0.08,afade=t=out:st=0.08:d=0.20,lowpass=f=1900,volume=0.35',
        whooshPath
      ]);
    }

    if (!fs.existsSync(hitPath)) {
      spawn(this.ffmpegPath, [
        '-y',
        '-f', 'lavfi', '-i', 'sine=f=75:d=0.3,afade=t=out:st=0.05:d=0.25,volume=0.4',
        hitPath
      ]);
    }
  }

  /**
   * Extract audio as a 16kHz mono MP3 or WAV for Whisper transcription
   */
  async extractAudio(videoPath, audioPath) {
    fs.mkdirSync(path.dirname(audioPath), { recursive: true });
    const args = [
      '-y',
      '-i', videoPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ar', '16000',
      '-ac', '1',
      '-q:a', '2',
      audioPath
    ];

    await this._runFFmpeg(args, 'Audio extraction');
    return audioPath;
  }

  /**
   * Inspect video duration, dimensions, fps
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=width,height,r_frame_rate',
        '-of', 'json',
        videoPath
      ]);

      let stdout = '';
      ffprobe.stdout.on('data', data => { stdout += data.toString(); });
      ffprobe.on('close', code => {
        try {
          const json = JSON.parse(stdout);
          const duration = parseFloat(json.format?.duration || '60');
          const videoStream = json.streams?.find(s => s.width && s.height) || {};
          resolve({
            duration,
            width: videoStream.width || 1280,
            height: videoStream.height || 720
          });
        } catch {
          resolve({ duration: 60, width: 1280, height: 720 });
        }
      });
      ffprobe.on('error', () => {
        resolve({ duration: 60, width: 1280, height: 720 });
      });
    });
  }

  /**
   * Cut video segment, apply dynamic punch-in zooms, color grading (color pop),
   * rapid-fire captions in optical center, and audio whoosh sound effects!
   */
  async cutAndReframe({
    inputPath,
    outputPath,
    startTime = 0,
    duration = 30,
    layout = 'viral_fullscreen_punch', // 'viral_fullscreen_punch' | 'blurred_background' | 'smart_crop' | 'split_screen'
    subtitlesAssPath = null,
    brollPath = null,
    brollStartTime = 3,
    brollDuration = 4,
    enableColorPop = true,
    enableZoomPunches = true,
    enableSFX = true
  }) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const inputs = ['-ss', String(startTime), '-t', String(duration), '-i', inputPath];
    let whooshIndex = -1;

    const whooshPath = path.join(this.sfxDir, 'whoosh.wav');
    if (enableSFX && fs.existsSync(whooshPath)) {
      inputs.push('-i', whooshPath);
      whooshIndex = 1;
    }

    if (brollPath && fs.existsSync(brollPath)) {
      inputs.push('-loop', '1', '-t', String(brollDuration), '-i', brollPath);
    }

    let filterGraph = '';

    if (layout === 'viral_fullscreen_punch' || layout === 'smart_crop') {
      // Full-screen 9:16 vertical crop with dynamic punch-in zoom alternation
      if (enableZoomPunches) {
        // Toggle every 3.2s between 1.0x wide portrait and 1.25x punch-in zoom
        filterGraph = `[0:v]crop=w='if(mod(floor(t/3.2),2), 324*ih/720, 405*ih/720)':h='if(mod(floor(t/3.2),2), 576*ih/720, ih)':x='(in_w-out_w)/2':y='(in_h-out_h)/2',scale=1080:1920`;
      } else {
        filterGraph = `[0:v]crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920`;
      }

      if (enableColorPop) {
        filterGraph += `,eq=contrast=1.18:saturation=1.35:brightness=0.01,unsharp=5:5:0.8[vbase]`;
      } else {
        filterGraph += `[vbase]`;
      }
    } else if (layout === 'split_screen') {
      filterGraph = '[0:v]scale=1080:-1[wide];[0:v]crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:960[top];[wide]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[bot];[top][bot]vstack[vbase]';
    } else {
      // Blurred background fallback
      filterGraph = '[0:v]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=8:8,scale=1080:1920[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[vbase]';
    }

    let currentStream = 'vbase';

    // Subtitle burning with ASS styling
    if (subtitlesAssPath && fs.existsSync(subtitlesAssPath)) {
      const escapedSubPath = this._escapeAssPath(subtitlesAssPath);
      filterGraph += `;[${currentStream}]subtitles='${escapedSubPath}'[vout]`;
      currentStream = 'vout';
    } else {
      filterGraph += `;[${currentStream}]copy[vout]`;
    }

    // Audio SFX whooshes on zoom transitions (at 3.2s, 6.4s, 9.6s, etc.)
    let audioMap = '0:a?';
    if (whooshIndex > 0 && enableSFX) {
      filterGraph += `;[${whooshIndex}:a]adelay=3200|3200,volume=0.3[w1];[0:a][w1]amix=inputs=2:dropout_transition=0[aout]`;
      audioMap = '[aout]';
    }

    const args = [
      '-y',
      ...inputs,
      '-filter_complex', filterGraph,
      '-map', '[vout]',
      '-map', audioMap,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '20',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath
    ];

    await this._runFFmpeg(args, 'Shorts rendering');
    return outputPath;
  }

  /**
   * Escape path for FFmpeg subtitles filter on Windows/Linux
   */
  _escapeAssPath(filePath) {
    const normalized = path.resolve(filePath).replace(/\\/g, '/');
    return normalized.replace(/:/g, '\\:');
  }

  _runFFmpeg(args, taskName = 'FFmpeg') {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';

      proc.stderr.on('data', data => {
        stderr += data.toString();
      });

      proc.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${taskName} failed with code ${code}.\nFFmpeg stderr: ${stderr.slice(-600)}`));
        }
      });

      proc.on('error', err => {
        reject(new Error(`Failed to start ${this.ffmpegPath}: ${err.message}`));
      });
    });
  }
}
