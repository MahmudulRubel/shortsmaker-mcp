import { spawn } from 'child_process';

/**
 * Smart Silence & Jump-Cut Removal Engine (MrBeast / Hormozi Rapid Pacing)
 * Detects dead air and breaths (>0.35s) using FFmpeg silencedetect,
 * trims pauses down to tight jump-cuts (~0.08s), and keeps subtitle timestamps in sync.
 */
export class SmartPacing {
  /**
   * Detect silence intervals in an audio or video file
   */
  static async detectSilences(filePath, { noiseThreshold = '-30dB', minSilenceDuration = 0.35 } = {}) {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', [
        '-v', 'info',
        '-i', filePath,
        '-af', `silencedetect=noise=${noiseThreshold}:d=${minSilenceDuration}`,
        '-f', 'null', '-'
      ]);

      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', () => {
        const silences = [];
        const lines = stderr.split('\n');
        let currentStart = null;

        for (const line of lines) {
          if (line.includes('silence_start:')) {
            const match = line.match(/silence_start:\s*([0-9.]+)/);
            if (match) currentStart = parseFloat(match[1]);
          } else if (line.includes('silence_end:') && currentStart !== null) {
            const endMatch = line.match(/silence_end:\s*([0-9.]+)/);
            const durMatch = line.match(/silence_duration:\s*([0-9.]+)/);
            if (endMatch) {
              const endSec = parseFloat(endMatch[1]);
              const durSec = durMatch ? parseFloat(durMatch[1]) : (endSec - currentStart);
              silences.push({
                start: currentStart,
                end: endSec,
                duration: durSec
              });
              currentStart = null;
            }
          }
        }
        resolve(silences);
      });
      proc.on('error', () => resolve([]));
    });
  }

  /**
   * Calculate speech active segments between silence intervals
   * with a tight breath margin (e.g. 0.06s) to preserve word attacks
   */
  static computeSpeechSegments(silences, totalDuration, { padSec = 0.06 } = {}) {
    if (!silences || silences.length === 0) {
      return [{ start: 0, end: totalDuration }];
    }

    const segments = [];
    let currentPos = 0;

    for (const silence of silences) {
      // Speech exists before this silence
      const speechEnd = Math.max(currentPos, silence.start + padSec);
      if (speechEnd > currentPos + 0.1) {
        segments.push({
          start: Math.max(0, currentPos - padSec),
          end: Math.min(totalDuration, speechEnd)
        });
      }
      currentPos = Math.max(0, silence.end - padSec);
    }

    // Trailing speech segment after the last silence
    if (currentPos < totalDuration - 0.15) {
      segments.push({
        start: currentPos,
        end: totalDuration
      });
    }

    return segments.length > 0 ? segments : [{ start: 0, end: totalDuration }];
  }

  /**
   * Shift subtitle timestamps so captions match tightened jump-cut video
   */
  static syncSubtitlesWithJumpCuts(words, speechSegments) {
    if (!words || words.length === 0 || !speechSegments || speechSegments.length <= 1) {
      return words;
    }

    // Build timeline offset map
    let cumulativeShift = 0;
    let prevSegEnd = 0;
    const adjustedWords = [];

    for (const word of words) {
      // Find which segment this word falls into
      const segIndex = speechSegments.findIndex(s => word.start >= s.start - 0.1 && word.end <= s.end + 0.1);
      if (segIndex !== -1) {
        const seg = speechSegments[segIndex];
        // How much dead air was removed before this segment?
        let timeRemovedBefore = 0;
        for (let i = 0; i < segIndex; i++) {
          const gap = speechSegments[i + 1].start - speechSegments[i].end;
          if (gap > 0) timeRemovedBefore += gap;
        }

        adjustedWords.push({
          ...word,
          start: Math.max(0, word.start - timeRemovedBefore),
          end: Math.max(0.1, word.end - timeRemovedBefore)
        });
      }
    }

    return adjustedWords.length > 0 ? adjustedWords : words;
  }
}
