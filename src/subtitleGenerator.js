import fs from 'fs';
import path from 'path';

export class SubtitleGenerator {
  static STYLES = {
    hormozi: {
      fontname: 'Impact',
      fontsize: 76,
      primaryColor: '&H00FFFFFF',      // Crisp White for upcoming text
      highlightColor: '&H0000FFFF',    // Electric Bright Yellow for active word (AABBGGRR)
      outlineColor: '&H00000000',      // Solid Black outline
      shadowColor: '&H90000000',
      outline: 7,
      shadow: 4,
      borderStyle: 1,
      alignment: 2, // bottom-center
      marginV: 680, // optical sweet spot in vertical center-lower third
      uppercase: true
    },
    hormozi_badge: {
      fontname: 'Arial Black',
      fontsize: 68,
      primaryColor: '&H00FFFFFF',
      highlightColor: '&H0000FFFF',
      outlineColor: '&H00000000',
      shadowColor: '&HA0000000',       // Dark pill badge background box
      outline: 0,
      shadow: 0,
      borderStyle: 3,                  // Opaque box / pill badge behind text
      alignment: 2,
      marginV: 680,
      uppercase: true
    },
    mrbeast: {
      fontname: 'Arial Black',
      fontsize: 72,
      primaryColor: '&H00FFFFFF',
      highlightColor: '&H0000FF33',    // Toxic Neon Green pop
      outlineColor: '&H00000000',
      shadowColor: '&HA0000000',
      outline: 8,
      shadow: 5,
      borderStyle: 1,
      alignment: 2,
      marginV: 680,
      uppercase: true
    },
    neon: {
      fontname: 'Impact',
      fontsize: 72,
      primaryColor: '&H00FFFFE0',
      highlightColor: '&H00FF00FF',    // Vibrant Magenta/Cyan glow
      outlineColor: '&H00150015',
      shadowColor: '&H00FF0080',
      outline: 6,
      shadow: 5,
      borderStyle: 1,
      alignment: 2,
      marginV: 680,
      uppercase: true
    },
    minimal: {
      fontname: 'Arial Black',
      fontsize: 66,
      primaryColor: '&H00FFFFFF',
      highlightColor: '&H0000D7FF',    // Vivid Orange
      outlineColor: '&H00000000',
      shadowColor: '&H80000000',
      outline: 5,
      shadow: 3,
      borderStyle: 1,
      alignment: 2,
      marginV: 680,
      uppercase: true
    }
  };

  static EMOJI_MAP = {
    'money': '💰',
    'revenue': '💸',
    'rich': '🤑',
    'scale': '📈',
    'skyrocketed': '🚀',
    'secret': '🤫',
    'mistake': '❌',
    'focus': '🎯',
    'growth': '🌱',
    'stop': '🛑',
    'scrolling': '📱',
    'brain': '🧠',
    'mind': '⚡',
    'think': '💡',
    'power': '🔥',
    'fire': '🔥',
    'hard': '💀',
    'error': '⚠️',
    'errors': '⚠️',
    'fail': '🚫',
    'win': '🏆',
    'winner': '👑',
    'wake': '🌅',
    'truth': '👁️',
    'shocking': '😱',
    'never': '⛔',
    'crazy': '🤯',
    'huge': '💥',
    'six': '🏏',
    'wicket': '☝️',
    'catch': '🧤',
    'shot': '🚀',
    'champion': '🥇'
  };

  /**
   * Generates a high-retention rapid-fire ASS subtitle file.
   * Uses 1-2 words per line so viewers' eyes stay locked onto the screen.
   * Returns generated ASS content and the array of phrase entry timestamps.
   */
  static generateASS({
    words = [],
    chunks = [],
    styleName = 'hormozi',
    outputPath,
    clipStartTime = 0,
    clipEndTime = 60,
    maxWordsPerBeat = 2, // 1-2 words per beat for viral retention
    hookBannerText = null
  }) {
    const style = this.STYLES[styleName] || this.STYLES.hormozi;

    const filteredWords = words
      .filter(w => w.start >= clipStartTime - 0.2 && w.end <= clipEndTime + 0.2)
      .map(w => ({
        ...w,
        start: Math.max(0, w.start - clipStartTime),
        end: Math.max(0, w.end - clipStartTime),
        word: style.uppercase ? w.word.toUpperCase() : w.word
      }));

    let wordList = filteredWords;
    if (wordList.length === 0 && chunks.length > 0) {
      wordList = this._synthesizeWordsFromChunks(chunks, clipStartTime, clipEndTime, style.uppercase);
    }
    if (wordList.length === 0) {
      const dur = Math.max(5, clipEndTime - clipStartTime);
      wordList = this._generateFallbackRhythmWords(dur, style.uppercase, hookBannerText);
    }

    // Group into 1-2 words per visual beat
    const phrases = this._groupWordsIntoPhrases(wordList, maxWordsPerBeat);
    const beatTimestamps = phrases.map(p => p.start);

    const borderStyle = style.borderStyle || 1;

    const header = `[Script Info]
Title: ShortsMaker Viral Eye-Catching Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontname},${style.fontsize},${style.primaryColor},${style.highlightColor},${style.outlineColor},${style.shadowColor},-1,0,0,0,100,100,2,0,${borderStyle},${style.outline},${style.shadow},${style.alignment},40,40,${style.marginV},1
Style: HookBanner,Arial Black,44,&H00000000,&H0000FFFF,&H0000FFFF,&H80000000,-1,0,0,0,100,100,1,0,1,6,3,8,30,30,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    let hookBannerEvent = '';
    if (hookBannerText) {
      hookBannerEvent = `Dialogue: 1,0:00:00.00,0:00:02.50,HookBanner,,0,0,0,,{\\fscx105\\fscy105\\an8}🔥  ${hookBannerText.toUpperCase()}  🔥\n`;
    }

    const events = phrases.map(phrase => {
      const phraseStart = this._formatTime(phrase.start);
      const phraseEnd = this._formatTime(phrase.end);

      // Karaoke tags with kinetic bounce pop
      const karaokeText = phrase.words.map(w => {
        const durationCentis = Math.max(12, Math.round((w.end - w.start) * 100));
        const emoji = this._findEmoji(w.word);
        const displayWord = emoji ? `${w.word} ${emoji}` : w.word;
        return `{\\k${durationCentis}}${displayWord}`;
      }).join(' ');

      // Kinetic pop scale tag on word entry: pops 115% and settles to 100% in 100ms
      return `Dialogue: 0,${phraseStart},${phraseEnd},Default,,0,0,0,,{\\t(0,70,\\fscx115\\fscy115)\\t(70,140,\\fscx100\\fscy100)}${karaokeText}`;
    }).join('\n');

    const assContent = `${header}\n${hookBannerEvent}${events}\n`;

    if (outputPath) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, assContent, 'utf8');
    }

    return {
      assContent,
      beatTimestamps
    };
  }

  static _findEmoji(rawWord) {
    const clean = rawWord.toLowerCase().replace(/[^a-z]/g, '');
    return this.EMOJI_MAP[clean] || null;
  }

  static _formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);

    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
  }

  static _groupWordsIntoPhrases(words, maxWordsPerPhrase = 2) {
    const phrases = [];
    for (let i = 0; i < words.length; i += maxWordsPerPhrase) {
      const slice = words.slice(i, i + maxWordsPerPhrase);
      if (slice.length === 0) continue;
      phrases.push({
        start: slice[0].start,
        end: slice[slice.length - 1].end,
        words: slice
      });
    }
    return phrases;
  }

  static _synthesizeWordsFromChunks(chunks, clipStartTime, clipEndTime, uppercase = true) {
    const words = [];
    for (const chunk of chunks) {
      const rawStart = chunk.timestamp ? chunk.timestamp[0] : (chunk.start !== undefined ? chunk.start : 0);
      const rawEnd = chunk.timestamp ? chunk.timestamp[1] : (chunk.end !== undefined ? chunk.end : rawStart + 2);
      if (rawStart >= clipEndTime || rawEnd <= clipStartTime) continue;

      const cStart = Math.max(0, rawStart - clipStartTime);
      const cEnd = Math.max(0, rawEnd - clipStartTime);

      const rawWords = (chunk.text || '').trim().split(/\s+/).filter(Boolean);
      if (rawWords.length === 0) continue;

      const chunkDur = Math.max(0.2, cEnd - cStart);
      const wordDur = chunkDur / rawWords.length;

      rawWords.forEach((rw, idx) => {
        const wStart = cStart + idx * wordDur;
        const wEnd = wStart + wordDur;
        words.push({
          word: uppercase ? rw.toUpperCase() : rw,
          start: wStart,
          end: wEnd
        });
      });
    }
    return words;
  }

  static _generateFallbackRhythmWords(duration, uppercase = true, hookText = null) {
    const defaultPhrases = [
      ['WATCH', 'CLOSELY'],
      ['LISTEN', 'TO THIS'],
      ['THE REAL', 'TRUTH'],
      ['EVERY SECOND', 'COUNTS'],
      ['NEVER', 'GIVE UP'],
      ['STOP', 'SCROLLING'],
      ['TAKE', 'ACTION'],
      ['THIS CHANGES', 'EVERYTHING'],
      ['PAY', 'ATTENTION'],
      ['DROP THE', 'EXCUSES'],
      ['STAND', 'FIRM'],
      ['STAY', 'FOCUSED'],
      ['REMEMBER', 'THIS'],
      ['FINAL', 'PAYOFF']
    ];

    if (hookText) {
      const hookWords = hookText.split(/\s+/).filter(Boolean);
      if (hookWords.length >= 2) {
        defaultPhrases[0] = [hookWords[0], hookWords[1]];
      }
    }

    const words = [];
    const step = 2.2;
    let t = 0.5;
    let phraseIdx = 0;

    while (t < duration - 0.5) {
      const pair = defaultPhrases[phraseIdx % defaultPhrases.length];
      const w1 = uppercase ? pair[0].toUpperCase() : pair[0];
      const w2 = uppercase ? pair[1].toUpperCase() : pair[1];

      words.push({ word: w1, start: t, end: t + 0.7 });
      words.push({ word: w2, start: t + 0.7, end: t + 1.4 });

      t += step;
      phraseIdx++;
    }

    return words;
  }
}
