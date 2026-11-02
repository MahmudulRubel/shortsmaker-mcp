import sys
import json
import cv2
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks import python

def track_face(video_path, start_time, duration, sample_fps=2):
    model_path = r'd:\downloads\shortsmaker\models\blaze_face_short_range.tflite'
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceDetectorOptions(base_options=base_options, min_detection_confidence=0.25)
    detector = vision.FaceDetector.create_from_options(options)

    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_fps = cap.get(cv2.CAP_PROP_FPS) or 30

    crop_w = int(height * 9 / 16)
    if crop_w % 2 != 0:
        crop_w += 1
    max_x = width - crop_w
    default_x = max(0, min(max_x, (width - crop_w) // 2))

    num_samples = int(duration * sample_fps)
    dt = duration / max(1, num_samples)

    raw_centers = []
    timestamps = []

    last_known_cx = width / 2.0

    for i in range(num_samples + 1):
        t = start_time + i * dt
        if t > start_time + duration:
            t = start_time + duration
        timestamps.append(round(i * dt, 2))

        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ret, frame = cap.read()
        if not ret or frame is None:
            raw_centers.append(last_known_cx)
            continue

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = detector.detect(mp_img)

        if res.detections:
            # Pick the most prominent / highest scoring face
            best_det = max(res.detections, key=lambda d: d.categories[0].score if d.categories else 0)
            box = best_det.bounding_box
            cx = box.origin_x + box.width / 2.0
            last_known_cx = cx
            raw_centers.append(cx)
        else:
            raw_centers.append(last_known_cx)

    cap.release()

    # Smooth the positions with a moving average filter
    smoothed_x = []
    window = 3
    for i in range(len(raw_centers)):
        start_idx = max(0, i - window)
        end_idx = min(len(raw_centers), i + window + 1)
        avg_cx = sum(raw_centers[start_idx:end_idx]) / (end_idx - start_idx)

        # Center the 9:16 crop box on avg_cx
        box_left = avg_cx - (crop_w / 2.0)
        clamped_x = max(0, min(max_x, int(round(box_left))))
        smoothed_x.append(clamped_x)

    # Build keypoints for FFmpeg crop expression
    keypoints = []
    for t_rel, x in zip(timestamps, smoothed_x):
        # Deduplicate identical consecutive timestamps
        if keypoints and keypoints[-1]['t'] == t_rel:
            continue
        keypoints.append({'t': t_rel, 'x': x})

    result = {
        'width': width,
        'height': height,
        'crop_w': crop_w,
        'crop_h': height,
        'keypoints': keypoints
    }
    return result

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(json.dumps({'error': 'Usage: face_tracker.py <video> <start> <duration>'}))
        sys.exit(1)
    
    vid = sys.argv[1]
    st = float(sys.argv[2])
    dur = float(sys.argv[3])
    res = track_face(vid, st, dur)
    print(json.dumps(res))
