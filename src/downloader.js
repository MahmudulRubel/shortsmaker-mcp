import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultInputDir = path.resolve(__dirname, '..', 'storage', 'inputs');

export class VideoDownloader {
  /**
   * Resolves a video source (local file or remote URL) to a local file path
   */
  static async resolveSource(source, outputDir = defaultInputDir) {
    fs.mkdirSync(outputDir, { recursive: true });

    // If it's already a local file
    if (fs.existsSync(source)) {
      return path.resolve(source);
    }

    // If it's a URL
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const isDirectFile = /\.(mp4|mov|mkv|webm|avi)(\?.*)?$/i.test(source);

      if (isDirectFile) {
        const destPath = path.join(outputDir, `downloaded_${Date.now()}.mp4`);
        await this._downloadDirectFile(source, destPath);
        return destPath;
      }

      // Check if yt-dlp is available for YouTube / social video URLs
      const hasYtDlp = await this._checkYtDlp();
      if (hasYtDlp) {
        const destTemplate = path.join(outputDir, `yt_${Date.now()}.%(ext)s`);
        return await this._downloadWithYtDlp(source, destTemplate);
      } else {
        throw new Error(
          `URL detected (${source}), but direct stream or yt-dlp was not found. Please provide a local video file path or direct MP4 URL, or install yt-dlp.`
        );
      }
    }

    throw new Error(`File or URL not found: ${source}`);
  }

  static _downloadDirectFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const client = url.startsWith('https') ? https : http;

      client.get(url, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Handle redirect
          return this._downloadDirectFile(response.headers.location, destPath).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${response.statusCode}`));
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(destPath));
        });
      }).on('error', err => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  static _getYtDlpPath() {
    const localExe = path.resolve('yt-dlp.exe');
    if (fs.existsSync(localExe)) {
      return localExe;
    }
    const projectRootExe = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'yt-dlp.exe'));
    if (fs.existsSync(projectRootExe)) {
      return projectRootExe;
    }
    return 'yt-dlp';
  }

  static async _checkYtDlp() {
    const binPath = this._getYtDlpPath();
    return new Promise(resolve => {
      const proc = spawn(binPath, ['--version']);
      proc.on('close', code => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  static async _downloadWithYtDlp(url, outputTemplate) {
    const binPath = this._getYtDlpPath();
    return new Promise((resolve, reject) => {
      const proc = spawn(binPath, [
        '--js-runtimes', 'node',
        '-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/best',
        '--write-auto-subs',
        '--write-subs',
        '--sub-lang', 'en.*,en',
        '--convert-subs', 'vtt',
        '-o', outputTemplate,
        '--no-playlist',
        url
      ]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });

      proc.on('close', code => {
        if (code === 0) {
          // Find downloaded file matching pattern - MUST match video extension, NOT subtitle (.vtt)
          const dir = path.dirname(outputTemplate);
          const basePrefix = path.basename(outputTemplate).split('.')[0];
          const files = fs.readdirSync(dir);
          const videoMatch = files.find(f => f.startsWith(basePrefix) && /\.(mp4|mkv|webm|mov|avi)$/i.test(f));
          const subMatch = files.find(f => f.startsWith(basePrefix) && /\.(vtt|srt|ass)$/i.test(f));

          if (subMatch) {
            // Also copy to storage/subtitles directory so transcription engine finds it immediately
            const destSub = path.resolve(dir, '..', 'subtitles', `${basePrefix}.vtt`);
            try {
              fs.copyFileSync(path.join(dir, subMatch), destSub);
            } catch {}
          }

          if (videoMatch) {
            return resolve(path.join(dir, videoMatch));
          }
          resolve(outputTemplate.replace('%(ext)s', 'mp4'));
        } else {
          reject(new Error(`yt-dlp failed: ${stderr.slice(-300)}`));
        }
      });

      proc.on('error', err => reject(err));
    });
  }
}
