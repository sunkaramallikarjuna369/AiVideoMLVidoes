# AI & Quantum Video Downloader

A FastAPI + React application to download AI and Quantum Computing course videos with a rich UI and progress tracking.

## Quick Start Guide

Follow these steps to run the application on your local machine:

### Step 1: Clone the Repository

```bash
git clone https://github.com/sunkaramallikarjuna369/AiVideoMLVidoes.git
cd AiVideoMLVidoes
```

### Step 2: Install Prerequisites

Make sure you have the following installed:

**Python 3.12+** - Download from https://www.python.org/downloads/

**Node.js 18+** - Download from https://nodejs.org/

**Poetry** (Python package manager) - Install with:
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### Step 3: Install Backend Dependencies

```bash
cd backend
poetry install
```

### Step 4: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Step 5: Start the Backend Server

Open a terminal and run:
```bash
cd backend
poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Keep this terminal open.

### Step 6: Start the Frontend Server

Open a NEW terminal and run:
```bash
cd frontend
npm run dev
```

You should see output like:
```
VITE v6.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

Keep this terminal open.

### Step 7: Open the Application

Open your web browser and go to: **http://localhost:5173**

You will see the Video Downloader interface with all 558 videos organized by module and chapter.

### Step 8: Download Videos

1. Click on a module name to expand it and see chapters
2. Click on a chapter name to see individual videos
3. Use checkboxes to select specific videos, or click "Select All" for a chapter
4. Click "Download All" to download all 558 videos, or "Download Selected" for chosen videos
5. Watch the progress bars as videos download
6. Videos are saved to the `downloads/` folder organized by module/chapter

## Features

- Browse 558 videos organized by module and chapter
- Select individual videos or entire chapters for download
- Real-time progress bars for each video download
- Overall download progress tracking
- Cancel and reset download functionality
- Videos saved in organized folder structure by module/chapter

## Project Structure

```
.
├── backend/               # FastAPI backend
│   ├── app/
│   │   └── main.py       # Main API code
│   └── pyproject.toml    # Python dependencies
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   └── App.tsx       # Main React component
│   └── package.json      # Node dependencies
├── video_urls_final.json  # Video metadata (558 videos)
└── downloads/             # Downloaded videos (created automatically)
```

## Troubleshooting

**Backend won't start:**
- Make sure Python 3.12+ is installed: `python --version`
- Make sure Poetry is installed: `poetry --version`
- Try reinstalling dependencies: `cd backend && poetry install`

**Frontend won't start:**
- Make sure Node.js 18+ is installed: `node --version`
- Try reinstalling dependencies: `cd frontend && rm -rf node_modules && npm install`

**Videos not downloading:**
- Check that the backend is running on port 8000
- Check browser console for errors (F12 > Console)
- Make sure you have internet connection

**Port already in use:**
- Backend: Change port with `--port 8001` and update frontend `.env` file
- Frontend: Change port with `npm run dev -- --port 3000`

## API Endpoints

- `GET /api/videos` - Get all videos organized by module/chapter
- `POST /api/download/start` - Start downloading videos
- `GET /api/download/status` - Get current download status
- `POST /api/download/cancel` - Cancel ongoing download
- `POST /api/download/reset` - Reset download progress

## Tech Stack

- **Backend**: FastAPI, aiohttp, aiofiles, sse-starlette
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Icons**: Lucide React
