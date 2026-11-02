import fs from 'fs';
import path from 'path';
import { SubtitleGenerator } from './src/subtitleGenerator.js';
import { VideoProcessor } from './src/videoProcessor.js';

function parseVtt(vttContent) {
  const blocks = vttContent.split('\n\n');
  const words = [];
  const cues = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;

    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim().split(' ')[0]);
    const startSec = timeToSec(startStr);
    const endSec = timeToSec(endStr);

    const textLines = lines.filter(l => !l.includes('-->') && !l.startsWith('WEBVTT') && !l.startsWith('NOTE') && !/^\d+$/.test(l));
    const rawText = textLines.join(' ').replace(/<[^>]+>/g, '').trim();

    if (rawText) {
      cues.push({ start: startSec, end: endSec, text: rawText });
      
      const rawWords = rawText.split(/\s+/).filter(Boolean);
      const dur = Math.max(0.2, endSec - startSec);
      const wordDur = dur / rawWords.length;
      rawWords.forEach((w, i) => {
        const wStart = startSec + i * wordDur;
        words.push({
          word: w,
          start: wStart,
          end: wStart + wordDur
        });
      });
    }
  }

  return { cues, words };
}

function timeToSec(tStr) {
  const parts = tStr.split(':').map(parseFloat);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseFloat(tStr) || 0;
}

const SWEET_SPOT_SHORTS = [
  {
    id: 1,
    title: 'EVERY MAN IS A MALE, BUT NOT EVERY MALE IS A MAN!',
    hookBanner: 'MALE VS REAL MAN 🤯',
    styleName: 'hormozi_badge',
    startSec: 17.5,
    duration: 44.0,
    hookLine: 'Every single man is a male, but not every male is a MAN!',
    postCaptions: [
      'What separates a male from a MAN? Controlling your anger, patience in hardship, and self-discipline! 🤯🔥',
      'The rawest reality check for modern masculinity. Being male is biology; being a man is a choice! 💯',
      'Share this with every young brother who needs to hear this truth today 🛑 #BeAMan'
    ],
    hashtags: ['#BeAMan', '#MohamedHoblos', '#RealMan', '#Discipline', '#SelfControl']
  },
  {
    id: 2,
    title: 'BENCH PRESSES 120KG BUT CANNOT LIFT A BLANKET FOR FAJR!',
    hookBanner: 'CANNOT LIFT A BLANKET 💀',
    styleName: 'mrbeast',
    startSec: 73.0,
    duration: 48.0,
    hookLine: 'He bench presses 120kg, but the same brother cannot lift a blanket for Fajr!',
    postCaptions: [
      'Big muscles in the gym, snapchatting his PR bench press, but zero strength for morning prayer?! 💀🏋️‍♂️',
      'Physical strength is useless if you have zero spiritual strength. Wake up! 🌅🔥',
      'The biggest gym contradiction of our generation. Drop the ego and lift that blanket! 💯'
    ],
    hashtags: ['#FajrReminder', '#GymMotivation', '#TrueStrength', '#DisciplineOverMotivation', '#GymHumor']
  },
  {
    id: 3,
    title: 'THEY ONLY WANTED JANNAH VS WE ALSO WANT JANNAH',
    hookBanner: 'THEY ONLY WANTED JANNAH ⚡',
    styleName: 'hormozi',
    startSec: 122.0,
    duration: 52.0,
    hookLine: 'You know what the difference between us and the Sahaba was?!',
    postCaptions: [
      'You cannot have everything. The Sahaba ONLY wanted Jannah. We ALSO want Jannah. See the difference?! ⚡🕊️',
      'A real man is realistic about his ultimate destination. Are you prioritizing this world or the next? 💯',
      'This single perspective will fundamentally change how you plan your life and goals 🔥'
    ],
    hashtags: ['#Sahaba', '#Jannah', '#SpiritualAwakening', '#IslamicShorts', '#DeenOverDunya']
  },
  {
    id: 4,
    title: 'WE ARE LITTLE BOYS STACKING BIG BODIES!',
    hookBanner: 'BOYS WITH BIG BODIES 🛑',
    styleName: 'hormozi_badge',
    startSec: 200.0,
    duration: 46.0,
    hookLine: 'We are not men today. We are little boys stacking big bodies!',
    postCaptions: [
      'Being a man is not a title you get—it is sacrifices, keeping your word, and taking full responsibility! 🛑👊',
      'Big beard and big muscles mean nothing if your character and commitments are child-sized! 💯',
      'Time to stop making excuses and start acting like men of honor and integrity 🛡️'
    ],
    hashtags: ['#GrowUp', '#Responsibility', '#Accountability', '#HardTruths', '#LifeLessons']
  },
  {
    id: 5,
    title: 'WE LOVE WOMEN, BUT NO ONE WANTS TO BE MARRIED!',
    hookBanner: 'MARRIAGE IS NOT A GAME 💍',
    styleName: 'neon',
    startSec: 240.0,
    duration: 55.0,
    hookLine: 'We love women, but no one loves the commitments of being MARRIED!',
    postCaptions: [
      'Everyone wants the honeymoon, but who is ready for the sacrifices and hardship of marriage?! 💍⚠️',
      'In marriage it is NOT all rainbows and lollipops! That is exactly why it is HALF your deen! 🌈',
      'Why modern relationships crumble: boys who run when things get difficult instead of leading like men 💯'
    ],
    hashtags: ['#MarriageAdvice', '#RelationshipTruths', '#HalfYourDeen', '#Commitment', '#SpouseReminder']
  },
  {
    id: 6,
    title: 'FATHERHOOD VS DRUG DEALING & SHORTCUTS!',
    hookBanner: 'TRUE FATHERHOOD 👶',
    styleName: 'mrbeast',
    startSec: 295.0,
    duration: 47.0,
    hookLine: 'Your ability to have children does NOT make you a man. Raising them does!',
    postCaptions: [
      'Anyone can father a child biologically. Raising them with presence and morals is what makes you a MAN! 👶👑',
      'We love money but hate hard work—that is why boys fall into drug dealing and fast-money traps! 💸🛑',
      'Stop seeking shortcuts. Build honest sweat, honest work, and true legacy 🔨'
    ],
    hashtags: ['#Fatherhood', '#RealFather', '#HardWork', '#NoShortcuts', '#Legacy']
  },
  {
    id: 7,
    title: 'WE LOVE JANNAH, BUT NO ONE WANTS TO DIE!',
    hookBanner: 'CLAIMS VS REALITY 🕊️',
    styleName: 'hormozi',
    startSec: 343.0,
    duration: 52.0,
    hookLine: 'Everyone claims they love the Prophet, but NO ONE wants his Sunnah!',
    postCaptions: [
      'Stop using "My Iman is in my heart" as an excuse for bad actions! Hypocrisy vs true faith 🕊️⚡',
      'Everyone claims they want Paradise, but nobody wants to live the sacrifices required to get there! 💯',
      'A piercing reminder that will make you reflect on your daily habits and genuine priorities 👁️'
    ],
    hashtags: ['#Sunnah', '#FaithInAction', '#SelfReflection', '#SpiritualGrowth', '#Truth']
  },
  {
    id: 8,
    title: 'THE BIGGEST SICKNESS IN THE UMMAH: WHERE ARE THE MEN?!',
    hookBanner: 'WHERE ARE THE REAL MEN? ⚠️',
    styleName: 'hormozi_badge',
    startSec: 410.0,
    duration: 58.0,
    hookLine: 'The biggest disease, the biggest calamity in the Ummah: There are NO MEN!',
    postCaptions: [
      'When there are no real men of honor, women and children suffer the most! ⚠️💔',
      'When the cat is away, the rats and mice come out to play. Look at our society today! 🛡️',
      'Ask yourself tonight before you sleep: Are you just a male, or are you a MAN?! 👑'
    ],
    hashtags: ['#WhereAreTheMen', '#Leadership', '#Honor', '#Courage', '#StandFirm']
  }
];

async function main() {
  console.log('🎬 Starting generation of Sweet Spot (40-60s) Viral Shorts with FACE TRACKING...');
  const vttPath = 'd:/downloads/shortsmaker/storage/subtitles/beaman_english.vtt';
  const vttContent = fs.readFileSync(vttPath, 'utf8');
  const { words, cues } = parseVtt(vttContent);
  const sourceVideo = 'd:/downloads/shortsmaker/storage/inputs/beaman.mp4';
  const vp = new VideoProcessor();

  for (const cfg of SWEET_SPOT_SHORTS) {
    const t0 = Date.now();
    console.log(`\n======================================================`);
    console.log(`🔥 SWEET SPOT SHORT ${cfg.id}/${SWEET_SPOT_SHORTS.length}: ${cfg.title}`);
    console.log(`⏱️ Duration: ${cfg.duration}s (Sweet spot: 40-60s)`);
    console.log(`🎯 Face Tracking: ENABLED (MediaPipe AI auto-reframing)`);
    console.log(`======================================================`);

    const subPath = `d:/downloads/shortsmaker/storage/subtitles/sweetspot_short_${cfg.id}.ass`;
    const outputPath = `d:/downloads/shortsmaker/storage/outputs/SweetSpot_Short_${cfg.id}.mp4`;

    // 1. Generate kinetic ASS subtitles with hook banner
    console.log(`📝 Generating ASS Subtitles (Style: ${cfg.styleName})...`);
    const subResult = SubtitleGenerator.generateASS({
      words,
      chunks: cues,
      styleName: cfg.styleName,
      outputPath: subPath,
      clipStartTime: cfg.startSec,
      clipEndTime: cfg.startSec + cfg.duration,
      hookBannerText: cfg.hookBanner
    });

    // 2. Render with VideoProcessor using Face Tracking + Ultrafast Turbo Engine
    console.log(`⚡ Turbo Rendering 1080x1920 with Face Tracking, Punch Zooms, SFX...`);
    await vp.cutAndReframe({
      inputPath: sourceVideo,
      outputPath,
      startTime: cfg.startSec,
      duration: cfg.duration,
      layout: 'viral_fullscreen_punch',
      subtitlesAssPath: subPath,
      subtitleBeatTimestamps: subResult.beatTimestamps,
      enableColorPop: true,
      enableZoomPunches: true,
      enableSFX: true,
      faceTracking: true,
      speedPreset: 'ultrafast'
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const stat = fs.statSync(outputPath);
    console.log(`✅ Sweet Spot Short ${cfg.id} rendered in ${elapsed}s! Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 ALL ${SWEET_SPOT_SHORTS.length} SWEET SPOT SHORTS (40-60s) GENERATED WITH FACE TRACKING!`);
  console.log(`======================================================`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
