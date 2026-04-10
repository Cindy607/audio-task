# audio-task

A demo that encodes audio with EnCodec and transmits it between two servers.

## How it works

Frontend → Server A (encodes audio) → Server B (decodes and saves as wav)

## Setup

### Backend
```bash
cd backend
pip install fastapi uvicorn encodec soundfile httpx
uvicorn serverA:app --port 8000 --reload
uvicorn serverB:app --port 8001 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Requirements
- Python 3.10
- ffmpeg installed at C:\ffmpeg\bin\ffmpeg.exe