from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import aiohttp
import aiofiles
import asyncio
import json
import os
import re
from typing import Optional

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# In-memory storage for download progress
download_progress: dict = {}
is_downloading = False

# Load video data from JSON file
# Get the project root directory (two levels up from this file)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VIDEO_JSON_PATH = os.path.join(PROJECT_ROOT, "video_urls_final.json")
DOWNLOAD_DIR = os.path.join(PROJECT_ROOT, "downloads")

# Ensure download directory exists
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def load_videos():
    with open(VIDEO_JSON_PATH, 'r') as f:
        data = json.load(f)
    return data

def sanitize_filename(name: str) -> str:
    """Sanitize filename to remove invalid characters"""
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = name.strip()
    return name[:200] if len(name) > 200 else name

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/videos")
async def get_videos():
    """Get all videos organized by module and chapter"""
    data = load_videos()
    videos = data.get("videos", [])
    
    # Organize by module and chapter
    organized = {}
    for idx, video in enumerate(videos):
        module = video.get("module", "Unknown Module")
        chapter = video.get("chapter", "Unknown Chapter")
        
        if module not in organized:
            organized[module] = {}
        if chapter not in organized[module]:
            organized[module][chapter] = []
        
        video_with_id = {**video, "id": idx}
        organized[module][chapter].append(video_with_id)
    
    return {
        "total_videos": data.get("total_videos", len(videos)),
        "total_lessons": data.get("total_lessons", 0),
        "extracted_at": data.get("extracted_at", ""),
        "organized": organized,
        "videos": [{"id": idx, **v} for idx, v in enumerate(videos)]
    }

@app.get("/api/progress")
async def get_progress():
    """Get current download progress"""
    return download_progress

@app.get("/api/progress/stream")
async def progress_stream():
    """SSE endpoint for real-time progress updates"""
    async def event_generator():
        while True:
            yield {
                "event": "progress",
                "data": json.dumps(download_progress)
            }
            await asyncio.sleep(0.5)
    
    return EventSourceResponse(event_generator())

class DownloadRequest(BaseModel):
    video_ids: Optional[list[int]] = None  # None means download all

@app.post("/api/download/start")
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Start downloading videos"""
    global is_downloading, download_progress
    
    if is_downloading:
        return {"status": "error", "message": "Download already in progress"}
    
    data = load_videos()
    videos = data.get("videos", [])
    
    # Filter videos if specific IDs provided
    if request.video_ids is not None:
        videos_to_download = [(idx, videos[idx]) for idx in request.video_ids if idx < len(videos)]
    else:
        videos_to_download = list(enumerate(videos))
    
    # Initialize progress
    download_progress = {
        "status": "downloading",
        "total": len(videos_to_download),
        "completed": 0,
        "failed": 0,
        "current_video": None,
        "current_progress": 0,
        "videos": {}
    }
    
    for idx, video in videos_to_download:
        download_progress["videos"][idx] = {
            "title": video.get("title", "Unknown"),
            "status": "pending",
            "progress": 0,
            "size": 0,
            "downloaded": 0
        }
    
    background_tasks.add_task(download_videos, videos_to_download)
    
    return {"status": "started", "total": len(videos_to_download)}

async def download_videos(videos_to_download: list):
    """Background task to download videos"""
    global is_downloading, download_progress
    is_downloading = True
    
    async with aiohttp.ClientSession() as session:
        for idx, video in videos_to_download:
            if download_progress.get("status") == "cancelled":
                break
            
            url = video.get("url", "")
            title = video.get("title", f"video_{idx}")
            module = sanitize_filename(video.get("module", "Unknown"))
            chapter = sanitize_filename(video.get("chapter", "Unknown"))
            
            # Create directory structure
            video_dir = os.path.join(DOWNLOAD_DIR, module, chapter)
            os.makedirs(video_dir, exist_ok=True)
            
            # Get filename from URL or use title
            filename = sanitize_filename(title) + ".mp4"
            filepath = os.path.join(video_dir, filename)
            
            download_progress["current_video"] = idx
            download_progress["videos"][idx]["status"] = "downloading"
            
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        total_size = int(response.headers.get('content-length', 0))
                        download_progress["videos"][idx]["size"] = total_size
                        
                        downloaded = 0
                        async with aiofiles.open(filepath, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                if download_progress.get("status") == "cancelled":
                                    break
                                await f.write(chunk)
                                downloaded += len(chunk)
                                download_progress["videos"][idx]["downloaded"] = downloaded
                                if total_size > 0:
                                    progress = int((downloaded / total_size) * 100)
                                    download_progress["videos"][idx]["progress"] = progress
                                    download_progress["current_progress"] = progress
                        
                        download_progress["videos"][idx]["status"] = "completed"
                        download_progress["videos"][idx]["progress"] = 100
                        download_progress["completed"] += 1
                    else:
                        download_progress["videos"][idx]["status"] = "failed"
                        download_progress["videos"][idx]["error"] = f"HTTP {response.status}"
                        download_progress["failed"] += 1
            except Exception as e:
                download_progress["videos"][idx]["status"] = "failed"
                download_progress["videos"][idx]["error"] = str(e)
                download_progress["failed"] += 1
    
    download_progress["status"] = "completed" if download_progress.get("status") != "cancelled" else "cancelled"
    download_progress["current_video"] = None
    is_downloading = False

@app.post("/api/download/cancel")
async def cancel_download():
    """Cancel ongoing download"""
    global download_progress
    if download_progress.get("status") == "downloading":
        download_progress["status"] = "cancelled"
        return {"status": "cancelling"}
    return {"status": "no_download_in_progress"}

@app.post("/api/download/reset")
async def reset_download():
    """Reset download progress"""
    global download_progress, is_downloading
    if not is_downloading:
        download_progress = {}
        return {"status": "reset"}
    return {"status": "error", "message": "Cannot reset while downloading"}

@app.get("/api/download/status")
async def download_status():
    """Get download status"""
    global is_downloading
    return {
        "is_downloading": is_downloading,
        "progress": download_progress
    }
