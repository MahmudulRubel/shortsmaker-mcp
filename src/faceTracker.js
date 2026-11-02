import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class FaceTracker {
  constructor(pythonCmd = 'py -3.13') {
    this.pythonCmd = pythonCmd;
    this.scriptPath = path.resolve('./src/face_tracker.py');
  }

  /**
   * Run face tracking on video segment and generate FFmpeg crop expression
   * @param {string} videoPath 
   * @param {number} startTime 
   * @param {number} duration 
   * @returns {Promise<{cropFilter: string, keypoints: Array}>}
   */
  async getTrackingCropFilter(videoPath, startTime, duration) {
    return new Promise((resolve, reject) => {
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
          console.warn(`[FaceTracker] Warning: Python tracker exited with code ${code}. Falling back to center crop.`);
          return resolve({
            cropXExpr: '(in_w-out_w)/2',
            keypoints: []
          });
        }

        try {
          // Parse last JSON line from stdout
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const data = JSON.parse(lastLine);

          if (!data.keypoints || data.keypoints.length === 0) {
            return resolve({
              cropXExpr: '(in_w-out_w)/2',
              keypoints: []
            });
          }

          // Sample down keypoints to ~every 1.5s for clean, non-bloated FFmpeg expression
          const downsampled = [];
          let lastT = -999;
          for (const kp of data.keypoints) {
            if (kp.t - lastT >= 1.5 || kp.t === 0 || kp.t >= duration - 0.5) {
              downsampled.push(kp);
              lastT = kp.t;
            }
          }

          if (downsampled.length <= 1) {
            const x = downsampled[0]?.x || 220;
            return resolve({
              cropXExpr: String(x),
              keypoints: downsampled
            });
          }

          // Build nested linear interpolation expression:
          // if(lte(t, t1), lerp(x0, x1), if(lte(t, t2), ...))
          let expr = String(downsampled[downsampled.length - 1].x);
          for (let i = downsampled.length - 2; i >= 0; i--) {
            const p0 = downsampled[i];
            const p1 = downsampled[i + 1];
            const dt = Math.max(0.1, p1.t - p0.t);
            const dx = p1.x - p0.x;
            const lerp = `(${p0.x}+(${dx})*(t-${p0.t.toFixed(1)})/${dt.toFixed(2)})`;
            expr = `if(lte(t,${p1.t.toFixed(1)}),${lerp},${expr})`;
          }

          resolve({
            cropXExpr: expr,
            keypoints: downsampled
          });
        } catch (err) {
          console.warn(`[FaceTracker] JSON parse error: ${err.message}. Falling back.`);
          resolve({
            cropXExpr: '(in_w-out_w)/2',
            keypoints: []
          });
        }
      });

      proc.on('error', err => {
        console.warn(`[FaceTracker] Process spawn error: ${err.message}. Falling back.`);
        resolve({
          cropXExpr: '(in_w-out_w)/2',
          keypoints: []
        });
      });
    });
  }
}
