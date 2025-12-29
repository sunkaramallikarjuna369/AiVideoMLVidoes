# AI & Quantum Video Downloader

A FastAPI + React application to download AI and Quantum Computing course videos with a rich UI and progress tracking.

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
├── backend/          # FastAPI backend
├── frontend/         # React + Vite frontend
├── video_urls_final.json  # Video metadata
└── downloads/        # Downloaded videos (created automatically)
```

## Prerequisites

- Python 3.12+
- Node.js 18+
- Poetry (Python package manager)

## Installation

### Backend Setup

```bash
cd backend
poetry install
```

### Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

## Usage

1. Browse videos organized by module and chapter in the accordion view
2. Click on modules to expand and see chapters
3. Click on chapters to see individual videos
4. Use checkboxes to select specific videos or click "Select All" for a chapter
5. Click "Download All" to download all 558 videos or "Download Selected" for chosen videos
6. Monitor progress with real-time progress bars
7. Videos are saved to the `downloads/` folder organized by module/chapter

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
