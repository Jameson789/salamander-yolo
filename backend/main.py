import time
from pathlib import Path
from threading import Thread
from collections import defaultdict

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import cv2
from ultralytics import YOLO

VIDEOS_DIR = Path(__file__).parent / "videos"
VIDEOS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Salamander Tracker POC")

app.mount("/videos", StaticFiles(directory=str(VIDEOS_DIR)), name="videos")

job = {"status": "idle"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("best.pt")
print(model.names)


@app.get("/")
def root():
    return {"ok": True}


def run_track_job():
    try:
        input_path = VIDEOS_DIR / "input.mp4"
        cap = cv2.VideoCapture(str(input_path))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        total_frames = total if total > 0 else 1
        
        # Fallback to 30 FPS if metadata reading fails
        actual_fps = fps if fps > 0 else 30.0

        output_path = VIDEOS_DIR / "output.mp4"
        writer = cv2.VideoWriter(
            str(output_path),
            cv2.VideoWriter_fourcc(*"avc1"),
            actual_fps,
            (width, height),
        )
        
        frames_seen = defaultdict(int)
        label_for = {}
        center_trajectory = []
        
        # Keep track of the next second boundary we are looking to capture
        next_target_second = 0.0

        for frame_idx in range(total):
            ok, frame = cap.read()
            if not ok:
                break
            result = model.track(frame, persist=True, verbose=False)[0]
            writer.write(result.plot())
            
            # Compute the EXACT real-time timestamp for the current frame
            current_time_s = frame_idx / actual_fps
            
            boxes = result.boxes
            if boxes is not None and boxes.id is not None:
                for tid, cls_id in zip(boxes.id.tolist(), boxes.cls.tolist()):
                    frames_seen[int(tid)] += 1
                    label_for[int(tid)] = model.names[int(cls_id)]
                
                # If this frame has hit or crossed our next whole-second target...
                if current_time_s >= next_target_second:
                    xyxy_list = boxes.xyxy.tolist()
                    largest_area = -1
                    largest_center = None
                    
                    for coords in xyxy_list:
                        xmin, ymin, xmax, ymax = coords
                        box_width = xmax - xmin
                        box_height = ymax - ymin
                        area = box_width * box_height
                        
                        if area > largest_area:
                            largest_area = area
                            cx = int((xmin + xmax) / 2)
                            cy = int((ymin + ymax) / 2)
                            largest_center = (cx, cy)
                    
                    if largest_center:
                        # Append the clean integer second target (0, 1, 2, etc.)
                        center_trajectory.append({
                            "time_s": int(next_target_second),
                            "x": largest_center[0],
                            "y": largest_center[1]
                        })
                        # Increment target by 1 second
                        next_target_second += 1.0

            job["percent"] = int((frame_idx + 1) / total_frames * 100)

            if frame_idx % 30 == 0:
                print(f"frame {frame_idx}/{total}")

        cap.release()
        writer.release()
        
        tracks = [
            {
                "track_id": tid,
                "time_on_screen_s": round(count / actual_fps, 2),
                "label": label_for[tid],
            }
            for tid, count in frames_seen.items()
        ]

        job.clear()
        job["status"] = "done"
        job["percent"] = 100
        job["result"] = {
            "video_url": f"http://localhost:8000/videos/output.mp4?t={int(time.time())}",
            "tracks": tracks,
            "trajectory": center_trajectory,
        }

    except Exception as e:
        print(f"error inside background job: {e}", flush=True)
        job.clear()
        job["status"] = "error"
        job["message"] = str(e)


@app.post("/track")
def start_track(video: UploadFile = File(...)):
    (VIDEOS_DIR / "input.mp4").write_bytes(video.file.read())
    job.clear()
    job["status"] = "processing"
    job["percent"] = 0
    Thread(target=run_track_job, daemon=True).start()
    return {"status": "processing"}


@app.get("/track")
def get_track():
    return job


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)