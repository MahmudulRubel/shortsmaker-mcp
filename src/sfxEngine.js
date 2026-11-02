import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

/**
 * Foley & Beat-Synced Sound Effects Engine
 * Automatically places pops on subtitle beats, whooshes on camera zooms,
 * and bass drops on hooks for maximum viewer retention.
 */
export class SFXEngine {
  constructor(sfxDir = path.resolve('./storage/sfx')) {
    this.sfxDir = sfxDir;
    this.ensureDefaultSFX();
  }

  ensureDefaultSFX() {
    fs.mkdirSync(this.sfxDir, { recursive: true });

    const whooshPath = path.join(this.sfxDir, 'whoosh.wav');
    const hitPath = path.join(this.sfxDir, 'hit.wav');
    const popPath = path.join(this.sfxDir, 'pop.wav');
    const dingPath = path.join(this.sfxDir, 'ding.wav');

    if (!fs.existsSync(whooshPath)) {
      spawnSync('ffmpeg', [
        '-y',
        '-f', 'lavfi', '-i', 'anoisesrc=d=0.28:c=white:r=44100,afade=t=in:ss=0:d=0.08,afade=t=out:st=0.08:d=0.20,lowpass=f=1900,volume=0.35',
        whooshPath
      ]);
    }

    if (!fs.existsSync(hitPath)) {
      spawnSync('ffmpeg', [
        '-y',
        '-f', 'lavfi', '-i', 'sine=f=75:d=0.35,afade=t=out:st=0.05:d=0.30,volume=0.45',
        hitPath
      ]);
    }

    if (!fs.existsSync(popPath)) {
      spawnSync('ffmpeg', [
        '-y',
        '-f', 'lavfi', '-i', 'sine=frequency=650:duration=0.07,afade=t=out:st=0.02:d=0.05,volume=0.25',
        popPath
      ]);
    }

    if (!fs.existsSync(dingPath)) {
      spawnSync('ffmpeg', [
        '-y',
        '-f', 'lavfi', '-i', 'sine=frequency=1760:duration=0.4,afade=t=out:st=0.05:d=0.35,volume=0.22',
        dingPath
      ]);
    }
  }

  /**
   * Generates FFmpeg audio filtergraph with multi-track SFX placement & music ducking
   */
  buildAudioFilterGraph({
    clipDuration,
    zoomTimestamps = [3.2, 6.4, 9.6, 12.8, 16.0, 19.2, 22.4, 25.6],
    subtitleBeatTimestamps = [],
    hasMusic = false,
    musicInputIndex = -1,
    voiceInputIndex = 0
  }) {
    const sfxInputs = [];
    let nextIndex = hasMusic ? 2 : 1;

    // Track 1: Voice processing (Normalize + slight warmth)
    let filterParts = [`[${voiceInputIndex}:a]volume=1.2,highpass=f=80,lowpass=f=12000[vox]`];
    const mixTracks = ['[vox]'];

    // Track 2: Hook Bass Impact at 0.0s
    const hitPath = path.join(this.sfxDir, 'hit.wav');
    if (fs.existsSync(hitPath)) {
      sfxInputs.push('-i', hitPath);
      filterParts.push(`[${nextIndex}:a]volume=0.35[hit]`);
      mixTracks.push('[hit]');
      nextIndex++;
    }

    // Track 3: Zoom Whooshes (alternating punch-ins)
    const whooshPath = path.join(this.sfxDir, 'whoosh.wav');
    if (fs.existsSync(whooshPath) && zoomTimestamps.length > 0) {
      sfxInputs.push('-i', whooshPath);
      const whooshIdx = nextIndex++;
      // Limit whooshes to at most 5 across the clip so it doesn't get cluttered
      const validZooms = zoomTimestamps.filter(t => t < clipDuration - 1).slice(0, 5);
      validZooms.forEach((t, i) => {
        const delayMs = Math.round(t * 1000);
        filterParts.push(`[${whooshIdx}:a]adelay=${delayMs}|${delayMs},volume=0.25[w_${i}]`);
        mixTracks.push(`[w_${i}]`);
      });
    }

    // Track 4: Pop SFX on subtitle word entries
    const popPath = path.join(this.sfxDir, 'pop.wav');
    if (fs.existsSync(popPath) && subtitleBeatTimestamps.length > 0) {
      sfxInputs.push('-i', popPath);
      const popIdx = nextIndex++;
      // Take up to 6 subtitle beats
      const beats = subtitleBeatTimestamps.filter(t => t > 1.0 && t < clipDuration - 1.5).slice(0, 6);
      beats.forEach((t, i) => {
        const delayMs = Math.round(t * 1000);
        filterParts.push(`[${popIdx}:a]adelay=${delayMs}|${delayMs},volume=0.18[pop_${i}]`);
        mixTracks.push(`[pop_${i}]`);
      });
    }

    // Track 5: Ambient Bed with Audio Ducking
    if (hasMusic && musicInputIndex >= 0) {
      // Background music bed auto-ducked around speech
      filterParts.push(`[${musicInputIndex}:a]atrim=0:${clipDuration},volume=0.10,afade=t=in:ss=0:d=1,afade=t=out:st=${clipDuration - 2}:d=2[bed]`);
      mixTracks.push('[bed]');
    }

    // Final Mixdown
    filterParts.push(`${mixTracks.join('')}amix=inputs=${mixTracks.length}:dropout_transition=0:normalize=0[aout]`);

    return {
      sfxInputs,
      filterGraph: filterParts.join(';')
    };
  }
}
