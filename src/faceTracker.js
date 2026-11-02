import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FaceTracker {
  constructor(pythonCmd = null) {
    this.pythonCmd = pythonCmd || this._detectPython();
    this.scriptPath = path.resolve(__dirname, 'face_tracker.py');
  }

  _detectPython() {
    if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;

    const candidates = process.platform === 'win32'
      ? ['py -3.13', 'py', 'python', 'python3']
      : ['python3', 'python'];

    for (const cmd of candidates) {
      try {
        const bin = cmd.split(' ')[0];
        const args = [...cmd.split(' ').slice(1), '--version'];
        execSync(`${cmd} --version`, { stdio: 'ignore', timeout: 1500 });
        return cmd;
      } catch {}
    }
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  /**
   * Run face tracking on video segment and generate FFmpeg crop expression
   */
  async getTrackingCropFilter(videoPath, startTime, duration) {
    return new Promise((resolve) => {
      if (!fs.existsSync(this.scriptPath)) {
        console.warn(`[FaceTracker] face_tracker.py not found at ${this.scriptPath}. Using center crop.`);
        return resolve({ cropXExpr: '(in_w-out_w)/2', keypoints: [] });
      }

      const parts = this.pythonCmd.split(' ');
      const bin = parts[0];
      const extraArgs = parts.slice(1);

      const args = [
        ...extraArgs,
        this.scriptPath,
        videoPath,
        String(startTime),
        String(duration)
      ];

      const proc = spawn(bin, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => { stdout += data.toString(); });
      proc.stderr.on('data', data => { stderr += data.toString(); });

      proc.on('close', code => {
        if (code !== 0) {
          console.warn(`[FaceTracker] Python tracker returned code ${code}. Falling back to center crop.`);
          return resolve({ cropXExpr: '(in_w-out_w)/2', keypoints: [] });
        }

        try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const data = JSON.parse(lastLine);

          if (!data.keypoints || data.keypoints.length === 0) {
            return resolve({ cropXExpr: '(in_w-out_w)/2', keypoints: [] });
          }

          // Sample down keypoints to ~every 1.5s for a clean FFmpeg expression
          const downsampled = [];
          let lastT = -999;
          for (const kp of data.keypoints) {
            if (kp.t - lastT >= 1.5 || kp.t === 0 || kp.t >= duration - 0.5) {
              downsampled.push(kp);
              lastT = kp.t;
            }
          }

          if (downsampled.length <= 1) {
            const x = downsampled[0]?.x || Math.round((data.width - data.crop_w) / 2);
            return resolve({ cropXExpr: String(x), keypoints: downsampled });
          }

          // Build nested linear interpolation expression for FFmpeg
          let expr = String(downsampled[downsampled.length - 1].x);
          for (let i = downsampled.length - 2; i >= 0; i--) {
            const p0 = downsampled[i];
            const p1 = downsampled[i + 1];
            const dt = Math.max(0.1, p1.t - p0.t);
            const dx = p1.x - p0.x;
            const lerp = `(${p0.x}+(${dx})*(t-${p0.t.toFixed(1)})/${dt.toFixed(2)})`;
            expr = `if(lte(t,${p1.t.toFixed(1)}),${lerp},${expr})`;
          }

          resolve({ cropXExpr: expr, keypoints: downsampled });
        } catch (err) {
          console.warn(`[FaceTracker] JSON parse error: ${err.message}. Falling back.`);
          resolve({ cropXExpr: '(in_w-out_w)/2', keypoints: [] });
        }
      });

      proc.on('error', err => {
        console.warn(`[FaceTracker] Process spawn error: ${err.message}. Falling back.`);
        resolve({ cropXExpr: '(in_w-out_w)/2', keypoints: [] });
      });
    });
  }
}
