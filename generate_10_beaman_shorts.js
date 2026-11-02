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

const SHORTS_CONFIG = [
  {
    id: 1,
    title: 'EVERY MAN IS A MALE, BUT NOT EVERY MALE IS A MAN!',
    hookBanner: 'MALE VS REAL MAN 🤯',
    styleName: 'hormozi_badge',
    startSec: 17.5,
    duration: 19,
    hookLine: 'Every single man is a male, but not every male is a MAN!',
    postCaptions: [
      'There is a MASSIVE difference between being a male and being a MAN. Watch this! 🤯🔥',
      'Speak the truth! Masculinity is not just physical, it is about discipline and self-control 💯',
      'The rawest reality check for every young brother out there today 🛑 #reminder'
    ],
    hashtags: ['#BeAMan', '#MohamedHoblos', '#IslamicReminder', '#RealMan', '#Discipline']
  },
  {
    id: 2,
    title: 'BENCH PRESSES 120KG BUT CANNOT LIFT A BLANKET FOR FAJR!',
    hookBanner: 'CANNOT LIFT A BLANKET 💀',
    styleName: 'mrbeast',
    startSec: 75.0,
    duration: 20,
    hookLine: 'He bench presses 120kg, but the same brother cannot lift a blanket for Fajr!',
    postCaptions: [
      'Big muscles in the gym, but zero strength for morning prayer?! The biggest contradiction 💀🏋️‍♂️',
      'Snapchatting his bench press, but missing the most important appointment of the day! 🔥',
      'True strength is not physical—it is waking up when nobody else wants to. 🌅'
    ],
    hashtags: ['#FajrReminder', '#GymMotivation', '#TrueStrength', '#DisciplineOverMotivation', '#WakeUp']
  },
  {
    id: 3,
    title: 'THE DIFFERENCE BETWEEN US AND THE SAHABA',
    hookBanner: 'THEY ONLY WANTED JANNAH ⚡',
    styleName: 'hormozi',
    startSec: 131.0,
    duration: 22,
    hookLine: 'You know what the difference between us and the Sahaba was?!',
    postCaptions: [
      'They ONLY wanted Jannah. We ALSO want Jannah. See the difference?! ⚡🕊️',
      'This explanation will completely shift the way you look at your priorities in life 💯',
      'Are you seeking Jannah as your priority, or just an afterthought? Powerful reminder! 🔥'
    ],
    hashtags: ['#Jannah', '#Sahaba', '#SpiritualAwakening', '#IslamicShorts', '#DeenOverDunya']
  },
  {
    id: 4,
    title: 'WE ARE LITTLE BOYS STACKING BIG BODIES!',
    hookBanner: 'BOYS WITH BIG BODIES 🛑',
    styleName: 'hormozi_badge',
    startSec: 211.0,
    duration: 21,
    hookLine: 'We are little boys that are stacking big bodies!',
    postCaptions: [
      'Today we have giant bodies with the mindset of fragile little children! Reality check 🛑',
      'Maturity is taking responsibility, keeping your word, and making sacrifices! 💯',
      'Stop playing games. It is time to grow up and take your life seriously 👊'
    ],
    hashtags: ['#GrowUp', '#Responsibility', '#Accountability', '#HardTruths', '#LifeLessons']
  },
  {
    id: 5,
    title: 'WE LOVE WOMEN, BUT NO ONE WANTS TO BE MARRIED!',
    hookBanner: 'MARRIAGE IS NOT A GAME 💍',
    styleName: 'neon',
    startSec: 240.0,
    duration: 22,
    hookLine: 'We love women, but no one loves the commitments of being MARRIED!',
    postCaptions: [
      'Everyone wants the idea of romance, but nobody wants the sacrifice of marriage! 💍⚠️',
      'A real man understands marriage takes work, patience, and character. Listen closely! 👂',
      'Why marriages fail today: boys who never learned to sacrifice. 💯'
    ],
    hashtags: ['#MarriageAdvice', '#RelationshipTruths', '#Commitment', '#SpouseReminder', '#RealTalk']
  },
  {
    id: 6,
    title: 'IN MARRIAGE IT IS NOT ALL RAINBOWS & LOLLIPOPS!',
    hookBanner: 'NOT ALL RAINBOWS 🌈',
    styleName: 'hormozi_badge',
    startSec: 275.0,
    duration: 21,
    hookLine: 'In marriage, it is NOT all rainbows and lollipops! It is hardship!',
    postCaptions: [
      'Marriage is difficult—and that is exactly why it is HALF your faith! 🌈💍',
      'When the hard times come, do you run away like a boy or stand firm like a man?! 💥',
      'The truth about long-term relationships nobody prepares you for! 💯'
    ],
    hashtags: ['#HalfYourDeen', '#HardshipToStrength', '#Patience', '#MarriageReality', '#Wisdom']
  },
  {
    id: 7,
    title: 'HAVING CHILDREN DOES NOT MAKE YOU A MAN!',
    hookBanner: 'BEING A FATHER VS MALE 👶',
    styleName: 'mrbeast',
    startSec: 296.0,
    duration: 19,
    hookLine: 'Your ability to have children does not make you a man. Raising them does!',
    postCaptions: [
      'Anyone can be a biological father. It takes a real MAN to raise children! 👶👑',
      'Fatherhood is sacrifice, presence, and moral guidance. Never abandon your role! 🛡️',
      'The difference between a male and a true father in 18 seconds! ⚡'
    ],
    hashtags: ['#Fatherhood', '#RealFather', '#ParentingAdvice', '#RoleModel', '#Legacy']
  },
  {
    id: 8,
    title: 'EVERYONE LOVES MONEY, BUT NO ONE WANTS TO WORK!',
    hookBanner: 'NO ONE WANTS TO WORK 💸',
    styleName: 'hormozi_badge',
    startSec: 314.0,
    duration: 21,
    hookLine: 'We love money, but no one wants to work! That is why drug dealing is so appealing!',
    postCaptions: [
      'Everyone wants fast cash, but nobody wants to put in the honest sweat and tears! 💸🛑',
      'The street will never build you. Hard, honest work builds character! 🔨',
      'Stop looking for shortcuts. Build real value and honor your reputation! 💯'
    ],
    hashtags: ['#HardWork', '#NoShortcuts', '#HonestLiving', '#MoneyMindset', '#Discipline']
  },
  {
    id: 9,
    title: 'WE LOVE JANNAH, BUT NO ONE WANTS TO DIE!',
    hookBanner: 'WE LOVE JANNAH BUT... 🕊️',
    styleName: 'hormozi',
    startSec: 365.0,
    duration: 22,
    hookLine: 'Everyone claims they love the Prophet, but no one wants his Sunnah!',
    postCaptions: [
      'We say we love Jannah, but are our daily actions matching our words?! 🕊️⚡',
      'Claims are cheap. Action is proof. A real man is honest with himself! 💯',
      'The most piercing reality check on hypocrisy you will hear this week 👁️'
    ],
    hashtags: ['#Sunnah', '#FaithInAction', '#SelfReflection', '#SpiritualGrowth', '#Truth']
  },
  {
    id: 10,
    title: 'THE BIGGEST SICKNESS IN THE UMMAH: THERE ARE NO MEN!',
    hookBanner: 'THE BIGGEST SICKNESS ⚠️',
    styleName: 'hormozi_badge',
    startSec: 415.0,
    duration: 23,
    hookLine: 'The biggest disease, the biggest calamity in the Ummah: There are NO MEN!',
    postCaptions: [
      'When there are no real men, who suffers the most? Women and children! ⚠️💔',
      'We do not lack books or apps—we lack men of principle, honor, and courage! 🛡️',
      'Ask yourself tonight: Are you a male, or are you a MAN?! 👑'
    ],
    hashtags: ['#WhereAreTheMen', '#Leadership', '#Honor', '#Courage', '#StandFirm']
  }
];

async function main() {
  console.log('🎬 Starting generation of 10 Master Viral Shorts (BE A MAN)...');
  const vttPath = 'd:/downloads/shortsmaker/storage/subtitles/beaman_english.vtt';
  const vttContent = fs.readFileSync(vttPath, 'utf8');
  const { words, cues } = parseVtt(vttContent);
  const sourceVideo = 'd:/downloads/shortsmaker/storage/inputs/beaman.mp4';
  const vp = new VideoProcessor();

  for (const cfg of SHORTS_CONFIG) {
    const t0 = Date.now();
    console.log(`\n======================================================`);
    console.log(`🔥 SHORT ${cfg.id}/10: ${cfg.title}`);
    console.log(`======================================================`);

    const subPath = `d:/downloads/shortsmaker/storage/subtitles/beaman_short_${cfg.id}.ass`;
    const outputPath = `d:/downloads/shortsmaker/storage/outputs/BeAMan_Short_${cfg.id}.mp4`;

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

    // 2. Direct 1-pass turbo render
    console.log(`⚡ Turbo Rendering 1080x1920 (ultrafast, punch zooms, SFX, color pop)...`);
    await vp.cutAndReframe({
      inputPath: sourceVideo,
      outputPath,
      startTime: cfg.startSec,
      duration: cfg.duration,
      layout: 'viral_fullscreen_punch',
      subtitlesAssPath: subPath,
      subtitleBeatTimestamps: subResult.beatTimestamps,
      enableSFX: true,
      enableColorPop: true,
      enableZoomPunches: true,
      speedPreset: 'ultrafast'
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const stats = fs.statSync(outputPath);
    console.log(`✅ Short ${cfg.id} rendered in ${elapsed}s! Size: ${(stats.size / (1024*1024)).toFixed(2)} MB`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 10 MASTER VIRAL SHORTS GENERATED SUCCESSFULLY!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
